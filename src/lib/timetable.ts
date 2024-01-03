import { Color } from "./color";
import { RailPath, TrainLine } from "./railway";
import { Feature, FeatureCollection, GeoJsonProperties, Geometry, LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon } from "geojson";
import * as turf from "@turf/turf";

export class TimeTable{

}

type DayType="Weekday"|"Saturday"|"Holiday";

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
     * 始発駅  
     * 駅コード.乗り場
     */
    readonly originstation:string;
    readonly homeindex:number;

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

    constructor(id:string,timetable:TrainRoute[],daytype:DayType[],trainnumber:string,type:string,destination:string,carcount:number,originstation:string)
    constructor(id:string,timetable:TrainRoute[],daytype:DayType[],trainnumber:string,type:string,destination:string,carcount:number,originstation:string,homeindex?:number,color?:Color){
        this.id=id;
        this.daytype=daytype;
        this.trainnumber=trainnumber;
        this.type=type;
        this.destination=destination;
        this.originstation=originstation;
        this.car=carcount;
        this.timetable=timetable;
        if(typeof homeindex==="undefined"){
            this.homeindex=0;
        }
        else{
            this.homeindex=homeindex;
        }
        if(typeof color==="undefined"){
            this.color=new Color("#000000");
        }
        else{
            this.color=color;
        }
    }

    public ani(timestamp:number){


        const t=timestamp%86400000;
        let route:TrainRoute=this.timetable[0];

        for(let i=this.timetable.length-2;0<=i;i--){
            if(this.timetable[i].departuretime<t){
                route=this.timetable[i];
                break;
            }
        }

        const param:GeoJsonProperties={
            "color":this.color.toString()
        };
        const pos=route.getPos(t,this.trainline!);
        console.log(pos.toString()+",")

        const geo=turf.geometry("Point",[pos.lng,pos.lat]);
        return [turf.feature(geo,pos)];
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
            if(typeof any["os"]!=="string"){
                throw Error("\"os\" not found.");
            }
            if(typeof any["c"]!=="number"){
                throw Error("\"c\" not found.");
            }
            if(!Array.isArray(any["tt"])){
                throw Error("\"tt\" is not set");
            }

            const tt:TrainRoute[]=[];
            for(let i=0;i<any["tt"].length;i++){
                tt.push(TrainRoute.parse(any["tt"][i]));
            }

            return new Train(any["id"],tt,any["w"],any["n"],any["y"],any["d"],any["c"],any["os"]);
        }
    }
}


/**
 * 車両の駅間の走行ルート
 * 設定項目はルートと
 */
export class TrainRoute{
    readonly station:`${string}.${string}`;

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
    public cache:RailPath[];

    /**
     * ルートの累積和配列
     */
    readonly routelength:number[];

    constructor(station:`${string}.${string}`,departuretime:string|number,arrivaltime:string|number,route:{id:string,direction:-1|1}[]){
        this.station=station;
        if(typeof arrivaltime==="string"){
            const [h,m]=arrivaltime.split(":");
            this.arrivaltime=((parseInt(h)*3600+parseInt(m)*60)*1000)%86400000;
        }
        else{
            this.arrivaltime=arrivaltime%86400000;
        }
        if(typeof departuretime==="string"){
            const [h,m]=departuretime.split(":");
            this.departuretime=((parseInt(h)*3600+parseInt(m)*60)*1000)%86400000;
        }
        else{
            this.departuretime=departuretime%86400000;
        }
        this.route=route;
        this.routelength=[0];
        this.cache=[];
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
            return new TrainRoute(any["s"],any["d"],any["a"],route);

        }
    }

    /**
     * 現在の座標を取得
     * @param time 現在時間 ms
     */
    public getPos(time:number,trainline:TrainLine){

        if(this.cache.length==0){
            for(let i=0;i<this.route.length;i++){
                this.cache.push(trainline.getRailPath(this.route[i].id)!);
                this.routelength.push(this.cache[i].length()+this.routelength[i]);
            }
        }

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
            return this.cache[0].getPos(sd);
        }
        else if(dt<=t){
            return this.cache[this.cache.length-1].getPos(ed);
        }

        /**
         * 現在のスタート位置からの距離
         */
        let d=(this.routelength[this.routelength.length-1]-sd-ed)*(t/dt)+sd;

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
     * JSON化
     * @returns Json
     */
    toJSON(){
        return{
            "s":this.station,
            "d":this.departuretime,
            "a":this.arrivaltime,
            "r":this.route.map((v)=>{
                return {id:v.id,dir:v.direction};
            })
        }
    }
}