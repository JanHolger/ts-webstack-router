import { HTTPMethod } from "./HTTPMethod";
import { HTTPStatus } from "./HTTPStatus";
import IHTTPSocket from "./adapter/IHTTPSocket";

export default class Exchange {

    private pathVariables: Map<string, any> = new Map()
    private queryParameters: Map<string, string> = new Map()
    private attributes: Map<string, any> = new Map()

    constructor(private socket: IHTTPSocket) {
        const urlSearch = new URLSearchParams(socket.getRequestQuery())
        urlSearch.forEach((value, key) => this.queryParameters.set(key, value))
    }

    status(status: HTTPStatus): Exchange {
        this.socket.setResponseStatus(status)
        return this
    }

    write(chunk: any) {
        this.socket.write(chunk)
    }

    close() {
        this.socket.close()
    }

    getMethod(): HTTPMethod {
        return this.socket.getRequestMethod()
    }

    getPath(): string {
        return this.socket.getRequestPath()
    }

    getPathVariables(): Map<string, any> {
        return this.pathVariables
    }

    attrib<T>(key: string, value?: any): T {
        if(value === undefined) {
            return this.attributes.get(key)
        }
        if(value === null) {
            this.attributes.delete(key)
        } else {
            this.attributes.set(key, value)
        }
        return value
    }

    query(key?: string) {
        if(key) {
            return this.queryParameters.get(key)
        }
        return this.queryParameters
    }

    path(key: string) {
        return this.pathVariables.get(key)
    }

}