import { Color } from "./color";
import { RailPath, TrainLine } from "./railway";
import { Feature, FeatureCollection, GeoJsonProperties, Geometry, LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon } from "geojson";
import * as turf from "@turf/turf";

export class TimeTable{

}

export type DayType="Weekday"|"Saturday"|"Holiday";

export class Train{
    readonly id:string;
    /**
     * 平日か休日
     */
    readonly daytype:DayType[];
    readonly trainnumber:string;
    /**
     * 種別、急行か普通か特急か
     */
    readonly type:string;
    /**
     * 行先
     */
    readonly destination:string;

    /**
     * 両数
     */
    private car:number=6;
    /**
     * 一両当たりの長さ[m]
     */
    private carlen:number=20;
    private color:Color;
    private nextframe:number=0;

    public trainline:TrainLine|null=null;


    readonly timetable:TrainRoute[];

    constructor(id:string,timetable:TrainRoute[],daytype:DayType[],trainnumber:string,type:string,destination:string,carcount:number,carlen:number);
    constructor(id:string,timetable:TrainRoute[],daytype:DayType[],trainnumber:string,type:string,destination:string,carcount:number,carlen:number,color:Color);
    constructor(id:string,timetable:TrainRoute[],daytype:DayType[],trainnumber:string,type:string,destination:string,carcount:number,carlen:number,color?:Color){
        this.id=id;
        this.daytype=daytype;
        this.trainnumber=trainnumber;
        this.type=type;
        this.destination=destination;
        this.car=carcount;
        this.timetable=timetable;
        if(typeof color==="undefined"){
            this.color=new Color("#000000");
        }
        else{
            this.color=color;
        }
        this.carlen=carlen;
    }

    public ani(timestamp:number){


        const t=timestamp%86400000;
        let route:TrainRoute=this.timetable[0];

        for(let i=this.timetable.length-1;0<=i;i--){
            if(this.timetable[i].departuretime<t){
                route=this.timetable[i];
                break;
            }
        }

        
        const {pos,color,angle}=route.getPosBytime(t,this.trainline!);
        const param:GeoJsonProperties={
            "color":color,
            "angle":angle
        };

        const geo=turf.geometry("Point",[pos.lng,pos.lat]);
        return [turf.feature(geo,param)];
    }

    public static parse(any:any):Train{
        if(typeof any==="string"){
            return this.parse(JSON.parse(any));
        }
        else{
            if(typeof any["id"]!=="string"){
                throw Error("\"id\" not found.");
            }
            if(!Array.isArray(any["w"])){
                throw Error("\"w\" is not set");
            }
            if(typeof any["n"]!=="string"){
                throw Error("\"n\" not found.");
            }
            if(typeof any["y"]!=="string"){
                throw Error("\"y\" not found.");
            }
            if(typeof any["d"]!=="string"){
                throw Error("\"d\" not found.");
            }
            if(typeof any["cl"]!=="number"){
                //throw Error("\"cl\" not found.");
            }
            if(typeof any["cn"]!=="number"){
                throw Error("\"cn\" not found.");
            }
            if(!Array.isArray(any["tt"])){
                throw Error("\"tt\" is not set");
            }

            const tt:TrainRoute[]=[];
            for(let i=0;i<any["tt"].length;i++){
                tt.push(TrainRoute.parse(any["tt"][i]));
            }
            const color=new Color(any["c"]);

            return new Train(any["id"],tt,any["w"],any["n"],any["y"],any["d"],any["cn"],20,color);
        }
    }

    /**
     * JSON化
     * @returns Json
     */
    toJSON(){
        return{
            "id":this.id,
            "w":this.daytype,
            "n":this.trainnumber,
            "y":this.type,
            "d":this.destination,
            "c":this.color,
            "cn":this.car,
            "cl":this.carlen,
            "tt":this.timetable
        }
    }
}


/**
 * 車両の駅間の走行ルート
 * 設定項目はルートと
 */
export class TrainRoute{
    readonly station:string;
    readonly homeindex:number;

    /**
     * 発車時刻 ms
     * その日の午前0時を0
     */
    readonly departuretime:number;
    /**
     * 次の駅到着時刻 ms
     */
    readonly arrivaltime:number;
    readonly route:{id:string,direction:-1|1}[];

    /**
     * レールパスのキャッシュ
     */
    private cache:RailPath[]=[];

    /**
     * ルートの累積和配列
     */
    readonly routelength:number[];

    constructor(station:string,homeindex:number,departuretime:string|number,arrivaltime:string|number,route:{id:string,direction:-1|1}[]){
        this.station=station;
        this.homeindex=homeindex;
        if(typeof arrivaltime==="string"){
            this.arrivaltime=TrainRoute.stringtoTime(arrivaltime)%86400000;
        }
        else{
            this.arrivaltime=arrivaltime%86400000;
        }
        if(typeof departuretime==="string"){
            this.departuretime=TrainRoute.stringtoTime(departuretime)%86400000;
        }
        else{
            this.departuretime=departuretime%86400000;
        }
        this.route=route;
        this.routelength=[0];
    }

    public static parse(any:any):TrainRoute{
        if(typeof any==="string"){
            return this.parse(JSON.parse(any));
        }
        else{
            if(typeof any["s"]==="undefined"){
                throw Error("\"s\" not found.");
            }
            if(typeof any["d"]==="undefined"){
                throw Error("\"d\" not found.");
            }
            if(typeof any["a"]==="undefined"){
                throw Error("\"a\" not found.");
            }
            if(typeof any["r"]==="undefined"){
                throw Error("\"r\" not found.");
            }

            let route:{id:string,direction:-1|1}[];
            if(!Array.isArray(any["r"])){
                throw Error("\"r\" is not Array");
            }
            else{
                route=[];
                for(let i=0;i<any["r"].length;i++){
                    route.push({
                        id:any["r"][i]["id"],
                        direction:any["r"][i]["dir"]
                    })
                }
            }
            const homeindex=typeof any["i"]==="number"?any["i"]:0;
            return new TrainRoute(any["s"],homeindex,any["d"],any["a"],route);

        }
    }

    public loadTrainline(trainline:TrainLine){
        if(this.cache.length==0){
            for(let i=0;i<this.route.length;i++){
                this.cache.push(trainline.getRailPath(this.route[i].id)!);
                this.routelength.push(this.cache[i].length()+this.routelength[i]);
            }
        }
    }

    public getPos(d:number,trainline:TrainLine){
        this.loadTrainline(trainline);
        let l=0;
        let r=this.routelength.length-1;
        while(l<=r){
            let c=Math.floor((r-l)/2)+l;
            if(d<this.routelength[c]){
                r=c-1;
            }
            else{
                l=c+1;
            }
        }
        while(d<this.routelength[l]){
            l--;
        }
        d-=this.routelength[l];
        const pos=this.cache[l].getPos(this.route[l].direction==-1?this.cache[l].length()-d:d);
        return pos;
    }

    /**
     * 現在の座標を取得
     * @param time 現在時間 ms
     */
    public getPosBytime(time:number,trainline:TrainLine){
        this.loadTrainline(trainline);
        time=time%86400000;
        const dt=((this.arrivaltime-this.departuretime)%86400000+86400000)%86400000;
        const t=((time-this.departuretime)%86400000+86400000)%86400000;

        /**
         * スタート位置
         */
        const sd=this.cache[0].length()/2;
        /**
         * 終了位置
         * 終了パスの長さの半分
         */
        const ed=this.cache[this.cache.length-1].length()/2;

        if(43200000<t){
            return {pos:this.cache[0].getPos(sd),color:"#0f0f0f",angle:0};
        }
        else if(dt<=t){
            return {pos:this.cache[this.cache.length-1].getPos(ed),color:"#0f0f00",angle:0};
        }

        /**
         * 現在のスタート位置からの距離
         */
        //let d=(this.routelength[this.routelength.length-1]-sd-ed)*(t/dt)+sd;
        const D=(this.routelength[this.routelength.length-1]-sd-ed);
        // A km/ms^2
        let A=0.0000000005;
        let st=(dt-Math.sqrt(dt*dt-4*D/A))/2;

        if(dt*dt-4*D/A<=0){
            A=4*D/(dt*dt);
            st=dt/2;
        }

        const d=(t<=st?(A*t*t)/2:(t<=(dt-st)?(A*st*t-(A*st*st)/2):(D-(A/2*(dt-t)*(dt-t)))))+sd;
        //console.log(`st:${st} d:${d}`);
        const pos=this.getPos(d,trainline);
        return {pos,color:(t<=st?"#ff0000":(t<=(dt-st)?"#00ff00":"#0000ff")),angle:pos.angle(this.getPos(d+0.02,trainline))};
    }

    /**
     * hh:mm:ss形式の文字列をmsに変換
     * @param hhmmss 
     * @returns ms
     */
    public static stringtoTime(hhmmss:string){
        const [h,m,ss]=hhmmss.split(":");
        const s=typeof ss==="undefined"?0:parseInt(ss);
        return (parseInt(h)*3600+parseInt(m)*60+s)*1000;
    }
    /**
     * ms時間をhh:mm:ss形式の文字列に変換
     * @param time 
     */
    public static TimetoString(time:number){
        time=Math.floor(time/1000);
        const s=time%60;
        const m=Math.floor(time/60)%60;
        const h=Math.floor(time/3600);
        return ("00"+h.toString()).slice(-2)+":"+("00"+m.toString()).slice(-2)+":"+("00"+s.toString()).slice(-2);
    }

    /**
     * JSON化
     * @returns Json
     */
    toJSON(){
        return{
            "s":this.station,
            "d":TrainRoute.TimetoString(this.departuretime),
            "a":TrainRoute.TimetoString(this.arrivaltime),
            "i":this.homeindex,
            "r":this.route.map((v)=>{
                return {id:v.id,dir:v.direction};
            })
        }
    }
}