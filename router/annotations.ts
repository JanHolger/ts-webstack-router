import { HTTPMethod } from "../HTTPMethod"

function routeAnnotation(method: HTTPMethod, path: string): (targetProto: any, methodName: string) => void {
    return (targetProto: any, methodName: string) => {
        if(!targetProto[methodName].__routes__) {
            targetProto[methodName].__routes__ = []
        }
        targetProto[methodName].__routes__.push({
            method,
            path
        })
    }
}

export interface Annotation {
    type: string
    [key: string | number | symbol]: any
}

export function Get(path = '/') {
    return routeAnnotation(HTTPMethod.GET, path)
}

export function Head(path = '/') {
    return routeAnnotation(HTTPMethod.HEAD, path)
}

export function Post(path = '/') {
    return routeAnnotation(HTTPMethod.POST, path)
}

export function Put(path = '/') {
    return routeAnnotation(HTTPMethod.PUT, path)
}

export function Patch(path = '/') {
    return routeAnnotation(HTTPMethod.PATCH, path)
}

export function Delete(path = '/') {
    return routeAnnotation(HTTPMethod.DELETE, path)
}

function parameterAnnotation(annotation: any): (targetProto: any, methodName: string, paramIndex: number) => void {
    return (targetProto: any, methodName: string, paramIndex: number) => {
        if(!targetProto[methodName].__param_annotations__) {
            targetProto[methodName].__param_annotations__ = []
        }
        if(!targetProto[methodName].__param_annotations__[paramIndex]) {
            targetProto[methodName].__param_annotations__[paramIndex] = []
        }
        targetProto[methodName].__param_annotations__[paramIndex].push(annotation)
    }
}

export function Query(name: string) {
    return parameterAnnotation({
        type: 'Query',
        name
    })
}

export function Path(name: string) {
    return parameterAnnotation({
        type: 'Path',
        name
    })
}

export function Attrib(name: string) {
    return parameterAnnotation({
        type: 'Attrib',
        name
    })
}

export function Body(targetProto: any, methodName: string, paramIndex: number) {
    return parameterAnnotation({
        type: 'Body'
    })(targetProto, methodName, paramIndex)
}

export function With(...middlewares: string[]): (targetProto: any, methodName?: string) => void {
    return (targetProto: any, methodName?: string) => {
        const target = methodName ? targetProto[methodName] : targetProto.prototype
        if(!target.__with__) {
            target.__with__ = []
        }
        target.__with__.push(...middlewares)
    }
}

export function PathPrefix(prefix): (targetProto: any) => void {
    return (targetProto: any) => {
        if(!targetProto.prototype.__path_prefix__) {
            targetProto.prototype.__path_prefix__ = []
        }
        targetProto.prototype.__path_prefix__.push(prefix)
    }
}