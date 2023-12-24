import RouteParamTransformer from "./RouteParamTransformer";

export default class DefaultRouteParamTransformer extends RouteParamTransformer {

    constructor() {
        super()
        this.add("*|any", ".*", (e, s) => s);
        this.add("*+|any+", ".+", (e, s) => s);
        this.add("s|string", "[^/]+", (e, s) => s);
        this.add("i|int|integer", "\\-?[0-9]+", (e, s) => parseInt(s));
        this.add("i*|int*|integer*", "[0-9]+", (e, s) => parseInt(s));
        this.add("i+|int+|integer+", "[1-9][0-9]*", (e, s) => parseInt(s));
        this.add("i-|int-|integer-", "\\-[1-9][0-9]*", (e, s) => parseInt(s));
        this.add("f|float|n|number", "\\-?[0-9]+(\\.[0-9]*)?", (e, s) => parseFloat(s));
        this.add("b|bool|boolean", "([Tt]rue|[Ff]alse|0|1)", (e, s) => s.toLowerCase() === 'true' || s === '1');
        this.add("uuid", "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}", (e, s) => s);
    }

}