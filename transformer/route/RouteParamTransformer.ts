import Exchange from "../../Exchange";
import { RouteParamTransformerFunction } from "./RouteParamTransformerFunction";

export default class RouteParamTransformer {

    regex: Map<string, string> = new Map()
    transformers: Map<string, RouteParamTransformerFunction> = new Map()

    protected add(name: string, regex: string, transformer: RouteParamTransformerFunction) {
        if(name.includes('|')) {
            for(let n of name.split('|')) {
                if(n.length == 0) {
                    continue
                }
                this.add(n, regex, transformer)
            }
            return
        }
        this.regex.set(name, regex)
        this.transformers.set(name, transformer)
    }

    protected extend(parent: string, name: string, transformer: RouteParamTransformerFunction) {
        this.add(name, this.getRegex(parent), (e, s) => transformer(e, this.transformers.get(parent)(e, s)))
    }

    public canTransform(name: string) {
        return this.regex.has(name)
    }

    public getRegex(name: string): string {
        return this.regex.get(name)
    }

    public transform(name: string, exchange: Exchange, source: any): any {
        if(this.transformers.has(name)) {
            return this.transformers.get(name)(exchange, source)
        }
        return source
    }

}