export class Color{
    readonly r:number;
    readonly g:number;
    readonly b:number;


    /**
     * 色を#000000の形式で入力する
     * @param hex 
     */
    constructor(hex:string);

    constructor(any:any){
        if(typeof any==="string"){
            const re=new RegExp("^#[0-9A-Fa-f]{6}$")
            if(any.match(re)){
                const hr=any.slice(1,3);
                const hg=any.slice(3,5);
                const hb=any.slice(5,7);

                this.r=parseInt(hr,16);
                this.g=parseInt(hg,16);
                this.b=parseInt(hb,16);

            }
            else{
                console.log("error")
                throw Error("not");
            }
        }
        else{
            this.r=0;
            this.g=0;
            this.b=0;
        }
    }

    /**
     * 色を#000000の形式で返す
     * @returns string
     */
    public toString(){
        return "#"+("00"+this.r.toString(16)).slice(-2)+("00"+this.g.toString(16)).slice(-2)+("00"+this.b.toString(16)).slice(-2);
    }
    /**
     * JSON化
     * @returns Json
     */
    toJSON(){
        return this.toString();
    }
}