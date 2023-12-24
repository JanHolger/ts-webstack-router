import { Socket } from "dgram";
import Exchange from "./Exchange";
import { ALL_METHODS, HTTPMethod } from "./HTTPMethod";
import HTTPRoutingOptions from "./HTTPRoutingOptions";
import IHTTPSocketServer from "./adapter/IHTTPSocketServer";
import { AfterRequestHandler } from "./handler/AfterRequestHandler";
import { ExceptionHandler } from "./handler/ExceptionHandler";
import { RequestHandler } from "./handler/RequestHandler";
import { RequestInterceptor } from "./handler/RequestInterceptor";
import Route from "./router/Route";
import RouteParamTransformer from "./transformer/route/RouteParamTransformer";
import RouteParamTransformerProvider from "./transformer/route/RouteParamTransformerProvider";
import DefaultRouteParamTransformer from "./transformer/route/DefaultRouteParamTransformer";
import RouteBinder from "./router/RouteBinder";
import { RouteAutoInjector } from "./router/RouteAutoInjector";

export default class HTTPRouter implements RouteParamTransformerProvider {

    private routeParamTransformers: RouteParamTransformer[] = [
        new DefaultRouteParamTransformer()
    ]
    private beforeInterceptors: RequestInterceptor[] = []
    private routes: Route[] = []
    private beforeRoutes: Route[] = []
    private afterRoutes: Route[] = []
    private beforeMiddlewares: Map<string, RequestHandler> = new Map()
    private afterMiddlewares: Map<string, AfterRequestHandler> = new Map()
    private routeAutoInjectors: RouteAutoInjector[] = []

    private _exceptionHandler: ExceptionHandler = (ex, err) => {
        ex.status(500)
        return 'An internal server error occured'
    }
    private _notFoundHandler: RequestHandler = (ex) => {
        ex.status(404)
        return 'Not Found'
    }
    private routingOptions: HTTPRoutingOptions = {
        ignoreTrailingSlash: false,
        caseInsensitive: false
    }
    private routeBinder: RouteBinder = new RouteBinder(this)

    constructor(private server: IHTTPSocketServer) {
        this.server.setHandler(socket => {
            const exchange = new Exchange(socket)
            this.execute(exchange)
        })
    }

    port(port: number): HTTPRouter {
        this.server.setPort(port)
        return this
    }

    get(pattern: string, ...handlers: RequestHandler[]): HTTPRouter {
        return this.route(null, HTTPMethod.GET, pattern, ...handlers)
    }

    post(pattern: string, ...handlers: RequestHandler[]): HTTPRouter {
        return this.route(null, HTTPMethod.POST, pattern, ...handlers)
    }

    delete(pattern: string, ...handlers: RequestHandler[]): HTTPRouter {
        return this.route(null, HTTPMethod.DELETE, pattern, ...handlers)
    }

    put(pattern: string, ...handlers: RequestHandler[]): HTTPRouter {
        return this.route(null, HTTPMethod.PUT, pattern, ...handlers)
    }

    patch(pattern: string, ...handlers: RequestHandler[]): HTTPRouter {
        return this.route(null, HTTPMethod.PATCH, pattern, ...handlers)
    }

    any(pattern: string, ...handlers: RequestHandler[]): HTTPRouter {
        ALL_METHODS.forEach(m => {
            this.route(null, m, pattern, ...handlers)
        })
        return this
    }

    beforeAny(pattern: string, ...handlers: RequestHandler[]): HTTPRouter {
        ALL_METHODS.forEach(m => {
            this.beforeRoute(null, m, pattern, ...handlers)
        })
        return this
    }

    afterAny(pattern: string, ...handlers: AfterRequestHandler[]): HTTPRouter {
        ALL_METHODS.forEach(m => {
            this.afterRoute(null, m, pattern, ...handlers)
        })
        return this
    }

    route(name: string, method: HTTPMethod, pattern: string, ...handlers: RequestHandler[]): HTTPRouter {
        this.routes.push(new Route(
            name,
            this,
            method,
            pattern,
            this.routingOptions,
            handlers,
            []
        ))
        return this
    }

    beforeRoute(name: string, method: HTTPMethod, pattern: string, ...handlers: RequestHandler[]): HTTPRouter {
        this.beforeRoutes.push(new Route(
            name,
            this,
            method,
            pattern,
            this.routingOptions,
            handlers,
            []
        ))
        return this
    }

    afterRoute(name: string, method: HTTPMethod, pattern: string, ...handlers: AfterRequestHandler[]): HTTPRouter {
        this.afterRoutes.push(new Route(
            name,
            this,
            method,
            pattern,
            this.routingOptions,
            [],
            handlers
        ))
        return this
    }

    notFound(notFoundHandler: RequestHandler): HTTPRouter {
        this._notFoundHandler = notFoundHandler
        return this;
    }

    exceptionHandler(exceptionHandler: ExceptionHandler): HTTPRouter {
        this._exceptionHandler = exceptionHandler
        return this
    }

    controller(controller: any, globalPrefix?: string): HTTPRouter {
        if(typeof controller == 'function') {
            controller = new controller()
        }
        this.routeBinder.bind(globalPrefix, controller)
        return this
    }

    middleware(name: string, handler: RequestHandler): HTTPRouter {
        this.beforeMiddlewares.set(name, handler)
        return this
    }

    afterMiddleware(name: string, handler: AfterRequestHandler): HTTPRouter {
        this.afterMiddlewares.set(name, handler)
        return this
    }

    autoInjector(injector: RouteAutoInjector): HTTPRouter {
        this.routeAutoInjectors.push(injector)
        return this
    }

    getRouteParamTransformer(type: string): RouteParamTransformer {
        return this.routeParamTransformers.find(t => t.canTransform(type))
    }

    getRouteParamTransformers(): RouteParamTransformer[] {
        return this.routeParamTransformers
    }

    getBeforeMiddleware(name: string): RequestHandler | undefined {
        return this.beforeMiddlewares.get(name)
    }

    getAfterMiddleware(name: string): AfterRequestHandler | undefined {
        return this.afterMiddlewares.get(name)
    }

    getRouteAutoInjectors(): RouteAutoInjector[] {
        return this.routeAutoInjectors
    }

    async execute(exchange: Exchange): Promise<void> {
        try {
            try {
                let response: any = null;
                try {
                    for (let ic of this.beforeInterceptors) {
                        if (ic(exchange)) {
                            exchange.close();
                            return;
                        }
                    }
                    middlewares:
                    for (let route of this.beforeRoutes) {
                        const pathVariables: Map<string, any> = route.match(exchange)
                        if (pathVariables == null) {
                            continue
                        }
                        for(let [key, value] of pathVariables) {
                            exchange.getPathVariables().set(key, value)
                        }
                        for (let handler of route.getHandlers()) {
                            try {
                                response = handler(exchange)
                            } catch (ex) {
                                response = this._exceptionHandler(exchange, ex)
                            }
                            if (response != null)
                                break middlewares;
                        }
                    }
                    exchange.getPathVariables().clear()
                    if (response == null) {
                        routes:
                        for (let route of this.routes) {
                            const pathVariables = route.match(exchange)
                            if (pathVariables == null)
                                continue;
                            for(let [key, value] of pathVariables) {
                                exchange.getPathVariables().set(key, value)
                            }
                            for (let handler of route.getHandlers()) {
                                response = handler(exchange)
                                if (response != null)
                                    break routes;
                            }
                            exchange.getPathVariables().clear()
                        }
                    }
                } catch (ex) {
                    response = this._exceptionHandler(exchange, ex)
                }
                if (response == null)
                    response = this._notFoundHandler(exchange);
                exchange.getPathVariables().clear()
                for (let route of this.afterRoutes) {
                    const pathVariables = route.match(exchange)
                    if (pathVariables == null)
                        continue
                    for(let [key, value] of pathVariables) {
                        exchange.getPathVariables().set(key, value)
                    }
                    for (let handler of route.getAfterHandlers())
                        response = handler(exchange, response)
                    exchange.getPathVariables().clear()
                }
                if (response != null)
                    exchange.write(this.transformResponse(exchange, response));
                exchange.close();
                return;
            } catch (ex) {
                try {
                    exchange.write(this.transformResponse(exchange, this._exceptionHandler(exchange, ex)));
                } catch (ex2) {
                    exchange.status(500);
                    console.error("An error occured in the exception handler!");
                }
            }
        } catch (ex) {
            // This should never be reached, just added this as a precaution
            console.error("An unexpected error occured in the exception handling of the exception handler (probably while setting the status)");
        }
        exchange.close();
    }

    private transformResponse(exchange: Exchange, response: any): any {
        return response // TODO
    }

    async start() {
        await this.server.start()
    }

}