import 'reflect-metadata'
import Exchange from "../Exchange";
import HTTPRouter from "../HTTPRouter";
import { Annotation } from './annotations';
import { HTTPMethod } from '../HTTPMethod';

interface ParamHint {
    type: any
    typeName: string
    annotations: Annotation[]
}

export default class RouteBinder {

    constructor(private router: HTTPRouter) {

    }

    bind(globalPrefix: string, controller: any) {
        globalPrefix = globalPrefix || ''
        const proto = controller.constructor.prototype
        const controllerWith = controller.__with__ || []
        const pathPrefixes = controller.__path_prefix__ || ['/']
        const methodNames = Object.getOwnPropertyNames(proto).filter(m => proto[m].__routes__)
        for(let methodName of methodNames) {
            const method = proto[methodName]
            const methodRoutes = method.__routes__
            const methodWith = method.__with__ || []
            const middlewares = [...new Set([...controllerWith, ...methodWith])]

            const paramTypes = Reflect.getMetadata('design:paramtypes', proto, methodName)
            if(paramTypes == null) {
                throw new Error('Missing metadata, make sure to enable emitDecoratorMetadata in your tsconfig')
            }
            const paramHints: ParamHint[] = paramTypes.map((type, index) => ({ type, typeName: type.name, annotations: method.__param_annotations__[index] || [] }))
            const invoker = new BindInvoker(this.router, controller[methodName], paramHints)
            for(let pathPrefix of pathPrefixes) {
                for(let route of methodRoutes) {
                    const pattern = buildPattern(globalPrefix, pathPrefix, route.path)
                    for(const m of middlewares) {
                        const before = this.router.getBeforeMiddleware(m)
                        if(before) {
                            this.router.beforeRoute(null, route.method, pattern, before)
                        }
                        const after = this.router.getAfterMiddleware(m)
                        if(after) {
                            this.router.afterRoute(null, route.method, pattern, after)
                        }
                        if(!before && !after) {
                            console.log(`WARNING: Middleware '${m}' not found!`)
                        }
                    }
                    this.router.route(null, route.method, pattern, ex => invoker.invoke(ex))
                }
            }
        }
    }

}

function buildPattern(globalPrefix: string, prefix: string, path: string): string {
    let pattern = globalPrefix != null ? globalPrefix : ""
    if (pattern.endsWith("/"))
        pattern = pattern.substring(0, pattern.length - 1)
    if (prefix.length > 0) {
        if (!prefix.startsWith("/"))
            pattern += "/"
        pattern += prefix
        if (pattern.endsWith("/"))
            pattern = pattern.substring(0, pattern.length - 1)
    }
    if (path.length > 0) {
        if (!path.startsWith("/"))
            pattern += "/"
        pattern += path
    }
    return pattern
}

class BindInvoker {

    constructor(private router: HTTPRouter, private method: Function, private paramHints: ParamHint[]) {}

    invoke(exchange: Exchange) {
        const args = this.paramHints.map((hint, index) => {
            if(hint.type == Exchange) {
                return exchange
            }
            if(hint.type == HTTPMethod) {
                return exchange.getMethod()
            }
            let a = hint.annotations.find(a => a.type == 'Attrib')
            if(a) {
                return exchange.attrib(a.name)
            }
            a = hint.annotations.find(a => a.type == 'Query')
            if(a) {
                return exchange.query(a.name)
            }
            a = hint.annotations.find(a => a.type == 'Path')
            if(a) {
                return exchange.path(a.name)
            }
            for(let injector of this.router.getRouteAutoInjectors()) {
                const v = injector(exchange, hint.annotations, hint.type)
                if(v !== null && v !== undefined) {
                    return v
                }
            }
            return null
        })

        return this.method(...args)
    }

}