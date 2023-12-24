import Exchange from "../Exchange"
import { HTTPMethod } from "../HTTPMethod"
import HTTPRoutingOptions from "../HTTPRoutingOptions"
import { AfterRequestHandler } from "../handler/AfterRequestHandler"
import { RequestHandler } from "../handler/RequestHandler"
import RouteParamTransformerProvider from "../transformer/route/RouteParamTransformerProvider"

function regexEscape(source: string): string {
    return source
            .replace(/\\/g, '\\\\')
            .replace(/\//g, '\\/')
            .replace(/\</g, '\\<')
            .replace(/\>/g, '\\>')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/\^/g, '\\^')
            .replace(/\$/g, '\\$')
            .replace(/\-/g, '\\-')
            .replace(/\+/g, '\\+')
            .replace(/\=/g, '\\=')
            .replace(/\!/g, '\\!')
            .replace(/\|/g, '\\|')
            .replace(/\?/g, '\\?')
            .replace(/\*/g, '\\*')
            .replace(/\./g, '\\.')
}

export default class Route {

    private compiledPattern: RegExp
    private variables: Map<string, string> = new Map()

    constructor(
        private name: string | null,
        private routeParamTransformerProvider: RouteParamTransformerProvider,
        private method: HTTPMethod,
        private pattern: string,
        options: HTTPRoutingOptions,
        private handlers: RequestHandler[],
        private afterHandlers: AfterRequestHandler[]
    ) {
        const variableDelimiter = ':'
        let p = pattern.toLowerCase()
        if(options.ignoreTrailingSlash && p.endsWith('/')) {
            p = p.substring(0, p.length-1)
        }
        if(!p.startsWith('/')) {
            p = '/' + p
        }
        let pos = 0
        let sb = ''
        let text = ''
        let inVar = false
        while(pos < p.length) {
            const c = p[pos]
            if(c == '{') {
                if(inVar) {
                    throw new Error(`Unexpected character '${c}' in route at position ${pos}`)
                }
                if(text.length > 0) {
                    sb += `(${ regexEscape(text) })`
                    text = ''
                }
                inVar = true
                pos++
                continue
            }
            if(c == '}') {
                if(!inVar) {
                    throw new Error(`Unexpected character '${c}' in route at position ${pos}`)
                }
                if(text.length > 0) {
                    let variableName = text
                    let type = 'string'
                    const loc = variableName.indexOf(variableDelimiter)
                    if(loc != -1) {
                        const t = variableName.substring(0, loc).toLowerCase()
                        variableName = variableName.substring(loc+1)
                        if(routeParamTransformerProvider.getRouteParamTransformer(t) != null) {
                            type = t
                        }
                    }
                    sb += `(?<${ regexEscape(variableName) }>${ routeParamTransformerProvider.getRouteParamTransformer(type).getRegex(type) })`
                    this.variables.set(variableName, type)
                    text = ''
                }
                inVar = false
                pos++
                continue
            }
            text += c
            pos++
        }
        if(inVar) {
            throw new Error('Unexpected end in route')
        }
        if(text.length > 0) {
            sb += `(${ regexEscape(text) })`
        }
        if(options.ignoreTrailingSlash) {
            sb += '/?'
        }
        this.compiledPattern = new RegExp(`^${sb}$`, options.caseInsensitive ? 'i' : '')
    }

    match(exchange: Exchange): Map<string, any> | null {
        if(exchange.getMethod() != this.method) {
            return null
        }
        const match = this.compiledPattern.exec(exchange.getPath())
        if(match) {
            const params: Map<string, any> = new Map()
            for(let [key, type] of this.variables) {
                params.set(key, this.routeParamTransformerProvider.getRouteParamTransformer(type).transform(type, exchange, match.groups[key]))
            }
            return params
        }
        return null
    }

    getHandlers(): RequestHandler[] {
        return this.handlers
    }

    getAfterHandlers(): AfterRequestHandler[] {
        return this.afterHandlers
    }

}