import { HTTPMethod } from "../HTTPMethod";
import { HTTPStatus } from "../HTTPStatus";

export default interface IHTTPSocket {

    getRequestMethod(): HTTPMethod
    getRequestPath(): string
    getRequestQuery(): string
    getRequestHeader(key: string): string
    getRequestHeaderNames(): string[]

    write(chunk: any): void
    setResponseStatus(status: HTTPStatus, message?: string): void
    setResponseHeader(key: string, value: string): void
    getResponseStatus(): HTTPStatus

    close()
    isClosed(): boolean

}