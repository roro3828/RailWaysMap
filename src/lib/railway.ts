import { Feature, FeatureCollection, GeoJsonProperties, Geometry, LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon } from "geojson";
import { Color } from "./color";
import * as turf from '@turf/turf';
import mapboxgl from "mapbox-gl";
/**
 * オブジェクトをMapにパースする<br/>
 * anyがundefinedの場合からのMapを返す
 * @param any パースする元オブジェクト
 * @param parser パーサー
 * @returns 
 */
export function parsetoMap<T>(any:any,parser:Function):Map<string,T>{
    if(typeof any==="string"){
        return parsetoMap<T>(JSON.parse(any),parser);
    }
    else if(Array.isArray(any)){
        let map=new Map<string,T>();
        for(let i=0;i<any.length;i++){
            const {key,value}:{key:string,value:T}=parser(any[i]);
            map.set(key,value);
        }
        return map;

    }
    else if(typeof any==="undefined"){
        return new Map<string,T>();
    }
    else{
        throw Error();
    }
}

export class Pos{
    /**
     * 経度
     */
    readonly lng:number;
    /**
     * 緯度
     */
    readonly lat:number;

    /**
     * Pos
     * @param lng 経度
     * @param lat 緯度
     */
    constructor(lng:number,lat:number){
        this.lng=lng;
        this.lat=lat;
    }

    /**
     * posと等しいかどうか
     * @param pos 
     * @returns boolean
     */
    public issame(pos:Pos){
        return (this.lat==pos.lat) && (this.lng==pos.lng);
    }

    /**
     * 現在地からposまでの距離km
     * @param pos 
     * @returns 距離km
     */
    public distance(pos:Pos){
        return turf.distance([this.lng,this.lat],[pos.lng,pos.lat]);
    }

    public angle(pos:Pos){
        const angle=turf.angle([this.lng,90],[this.lng,this.lat],[pos.lng,pos.lat]);
        if(this.lng<pos.lng){
            return angle;
        }
        else{
            return -angle;
        }
    }

    /**
     * 現在地からposまでのベクトル
     * @param pos 
     * @returns 
     */
    public sub(pos:Pos){
        const lat=pos.lat-this.lat;
        const lng=pos.lng-this.lng;
        return {lat:lat,lng:lng};
    }

    /**
     * GoogleMapで使うパスのフォーマットを取得
     * @returns {'lat': num,'lng': num}
     */
    public googlemapformat(){
        return {'lat': this.lat, 'lng': this.lng};
    }

    /**
     * オブジェクトをPosに変換
     * @param any オブジェクト
     * @returns Pos
     */
    public static parse(any:any):Pos{
        if(typeof any==="string"){
            return this.parse(JSON.parse(any));
        }
        if(Array.isArray(any)){
            if(any.length==2){
                if((typeof any[0]==="number")&&(typeof any[1]==="number")){
                    return new Pos(any[0],any[1]);
                }
            }
        }
        else if(typeof any["lat"]==="number"&&typeof any["lng"]==="number"){
            return new Pos(any["lng"],any["lat"]);
        }
        
        if(any instanceof Pos){
            return any;
        }

        throw Error("any is not pos");
    }

    /**
     * 文字列化
     * @returns String
     */
    toString(){
        return JSON.stringify(this.toJSON());
    }

    /**
     * JSON化
     * @returns Json
     */
    toJSON(){
        return [this.lng,this.lat];
    }

}


export class RailPath{
    readonly path:Pos[]=[];
    private distance_sum:number[]=[];
    public railtype:"rail"|"station";
    readonly track:"single"|"double";
    readonly id:string;

    /**
     * 路線を描画するパス
     * @param path 
     */
    constructor(path:any,id:string,type?:"rail"|"station",track?:"single"|"double"){
        this.id=id;
        if(Array.isArray(path)){
            for(let i=0;i<path.length;i++){
                const pos=Pos.parse(path[i]);
                this.path.push(pos);
            }
        }
        else{
            throw Error("not a path");
        }

        if(typeof type==="undefined"){
            this.railtype="rail";
        }
        else{
            this.railtype=type;
        }
        if(typeof track==="undefined"){
            this.track="double";
        }
        else{
            this.track=track;
        }
    }

    /**
     * index番目のPosを返す
     * @param index 
     * @returns 
     */
    public get(index:number){
        if(index<this.path.length){
            return this.path[index];
        }
        else{
            throw Error("out of range!!");
        }
    }

    /**
     * パスの始点を返す
     * @returns Pos
     */
    public first(){
        return this.path[0];
    }
    /**
     * パスの終点を返す
     * @returns Pos
     */
    public end(){
        return this.path[this.size()-1];
    }

    /**
     * 逆にした新しいパスを返す
     * @returns Railpath
     */
    public reverse(){
        let newpath:Pos[]=[];
        for(let i=this.path.length-1;0<=i;i--){
            newpath.push(this.path[i]);
        }
        return new RailPath(newpath,this.id,this.railtype,this.track);
    }

    /**
     * path1+path2の新しいPathを生成
     * 遅い
     * @param path1 
     * @param path2 
     * @returns Railpath
     */
    public static combine(path1:RailPath,path2:RailPath){
        let newpath:Pos[]=[];
        for(let i=0;i<path1.size();i++){
            newpath.push(path1.get(i));
        }
        for(let i=0;i<path2.size();i++){
            newpath.push(path2.get(i));
        }
        return new RailPath(newpath,path1.id,path1.railtype,path1.track);
    }

    /**
     * pathのサイズを返す
     * @returns 
     */
    public size(){
        return this.path.length;
    }
    /**
     * パスの始点から終点までの長さを返す
     */
    public length(){
        if(this.distance_sum.length==0){
            this.distance_sum=new Array<number>(this.path.length);
            this.distance_sum[0]=0;
            for(let i=1;i<this.path.length;i++){
                this.distance_sum[i]=this.distance_sum[i-1]+this.path[i-1].distance(this.path[i]);
            }
            
        }
        return this.distance_sum[this.size()-1];
    }

    /**
     * 始点からd[km]沿って進んだ位置を返す
     * パス全長よりも長い場合終点を返す
     * @param d 
     */
    public getPos(d:number){
        if(d<=0){
            return this.first();
        }
        if(this.length()<=d){
            return this.end();
        }
        let l=0;
        let r=this.distance_sum.length-1;
        while(l<=r){
            let c=Math.floor((r-l)/2)+l;
            if(this.distance_sum[c]==d){
                return this.path[c];
            }
            else if(d<this.distance_sum[c]){
                r=c-1;
            }
            else{
                l=c+1;
            }
        }
        while(d<this.distance_sum[l]){
            l--;
        }
        d-=this.distance_sum[l];
        if(this.path.length<=l+1){
            return this.end();
        }
        const sub=this.path[l].sub(this.path[l+1]);
        const ll=this.path[l].distance(this.path[l+1]);
        if(ll==0){
            return this.path[l];
        }
        const dlat=d/ll*sub.lat+this.path[l].lat;
        const dlng=d/ll*sub.lng+this.path[l].lng;
        //*/
        //const pos=turf.along(turf.lineString(this.path.map((p)=>p.toJSON())),d);

        return new Pos(dlng,dlat);
    }

    /**
     * パスを間引く
     * @param d d[km]未満の距離の点を消す
     * @returns RailPath
     */
    public thinning(d:number){
        let newpath:Pos[]=[];
        let last=this.path[0];
        newpath.push(last);
        for(let i=1;i<this.size()-1;i++){
            if(d<last.distance(this.path[i])){
                newpath.push(this.path[i]);
                last=this.path[i];
            }
        }
        newpath.push(this.path[this.size()-1]);
        return new RailPath(newpath,this.id,this.railtype,this.track);
    }

    /**
     * GoogleMapで使うパスのフォーマットを取得
     * @returns 
     */
    public googlemapformat(){
        let path=[];
        for(let i=0;i<this.size();i++){
            path.push(this.path[i].googlemapformat());
        }
        return path;
    }

    /**
     * 文字列をパース
     * @param any 
     * @returns 
     */
    public static parse(any:any):{key:string,value:RailPath}{
        if(typeof any==="string"){
            return this.parse(JSON.parse(any));
        }
        else{
            if(Array.isArray(any["path"])&&typeof any["id"]==="string"){
                return {key:any["id"],value:new RailPath(any["path"],any["id"],any["railtype"],any["track"])};
            }
        }

        throw Error("parse Error");
    }

    /**
     * JSON化
     * @returns Json
     */
    toJSON(){
        return {
            "id":this.id,
            "railtype":this.railtype,
            "track":this.track,
            "path":this.path
        };
    }
}

export class Station{
    public name:string;
    readonly id:string;
    readonly groupcode:string;
    readonly locations:string[];

    constructor(name:string,id:string,groupcode:string,locations:string[]){
        this.name=name;
        this.id=id;
        this.groupcode=groupcode;
        this.locations=locations;
    }

    /**
     * JSONをパース
     * @param any 
     * @returns Station
     */
    public static parse(any:any):{key:string,value:Station}{
        if(typeof any==="string"){
            return this.parse(JSON.parse(any));
        }
        else{
            if(typeof any["name"]==="string"&&typeof any["id"]==="string"&&typeof any["groupcode"]==="string"&&typeof any["locations"]==="object"){
                return {key:any["id"],value:new Station(any["name"],any["id"],any["groupcode"],any["locations"])};
            }
        }

        throw Error("parse Error");
    }
    /**
     * JSON化
     * @returns Json
     */
    toJSON(){
        return {
            "name":this.name,
            "id":this.id,
            "groupcode":this.groupcode,
            "locations":this.locations
        };
    }
}

export class TrainLine{
    public name:string;
    readonly id:string;
    public type:number;
    public symbol:string;
    public color:Color;
    readonly railpaths:Map<string,RailPath>;
    readonly stations:Map<string,Station>;

    constructor(name:string,id:string,type:number,railpaths?:Map<string,RailPath>,stations?:Map<string,Station>,symbol?:string,color?:Color){
        this.name=name;
        this.id=id;
        this.type=type;
        if(typeof railpaths==="undefined"){
            this.railpaths=new Map<string,RailPath>;
        }
        else{
            this.railpaths=railpaths;
        }
        if(typeof stations==="undefined"){
            this.stations=new Map<string,Station>();
        }
        else{
            this.stations=stations;
        }
        if(typeof symbol!=="string"){
            this.symbol=id;
        }
        else{
            this.symbol=symbol;
        }
        if(typeof color==="undefined"){
            this.color=new Color("#000000");
        }
        else{
            this.color=color;
        }
    }

    /**
     * 文字列をパース
     * @param any 
     * @returns 
     */
    public static parse(any:any):{key:string,value:TrainLine}{
        if(typeof any==="string"){
            return this.parse(JSON.parse(any));
        }
        else if(typeof any==="object"){
            const name=typeof any["name"]==="string"?any["name"]:"trainline";
            if(typeof any["id"]!=="string"){
                throw Error("id is not set");
            }
            const id=any["id"];
            const type=typeof any["type"]==="number"?any["type"]:0;
            const railpaths=typeof any["railpaths"]==="undefined"?undefined:parsetoMap<RailPath>(any["railpaths"],RailPath.parse);

            const stations=typeof any["stations"]==="undefined"?undefined:parsetoMap<Station>(any["stations"],Station.parse);
            
            return {key:id,value:new TrainLine(name,id,type,railpaths,stations,any["symbol"],typeof any["color"]==="string"?new Color(any["color"]):undefined)};
        }
        else{
            throw Error("input is not object");
        }
    }

    /**
     * 駅を取得する
     * @param key 
     * @returns Station
     */
    public getStation(key:string){
        return this.stations.get(key);
    }
    /**
     * 線路パスを取得する
     * @param key 
     * @returns RailPath
     */
    public getRailPath(key:string){
        return this.railpaths.get(key);
    }
    /**
     * 駅の数を取得する
     * @returns size
     */
    public getStationsCount(){
        return this.stations.size;
    }
    /**
     * 線路パスの数を取得する
     * @returns size
     */
    public getRailPathsCount(){
        return this.railpaths.size;
    }
    /**
     * 駅を追加する
     * @param station 
     * @returns id
     */
    public addStation(station:Station){
        this.stations.set(station.id,station);
        return station.id;
    }
    /**
     * 線路パスを追加する
     * @param railpath 
     * @returns key
     */
    public addRailPath(railpath:RailPath){
        this.railpaths.set(railpath.id,railpath);
        return railpath.id;
    }

    /**
     * 駅のIDリストを取得
     * @returns IDs
     */
    public getStationIDs(){
        let ids:string[]=[];
        this.stations.forEach((v,k)=>{ids.push(k)});
        return ids;
    }

    /**
     * GeoJsonを取得する
     * @returns Geojson
     */
    public toGeojson(){
        let features:Feature<Point | MultiPoint | LineString | MultiLineString | Polygon | MultiPolygon, GeoJsonProperties>[]=[];
        this.railpaths.forEach((v)=>{
            const geo=turf.geometry("LineString",v.path);
            const property:GeoJsonProperties={
                "color":this.color.toString(),
                "width":v.railtype=="rail"?4:8,
                "railtype":v.railtype,
                "id":v.id,
                "track":v.track
            };
            const feat=turf.feature(geo,property);
            features.push(feat);
        })
        return turf.featureCollection(features);
    }

    /**
     * JSON化
     * @returns Json
     */
    toJSON(){
        let list:Station[]=[]
        this.stations.forEach((v)=>{
            list.push(v);
        });
        let rlist:RailPath[]=[];
        this.railpaths.forEach((v)=>{
            rlist.push(v);
        })
        return{
            "name":this.name,
            "id":this.id,
            "type":this.type,
            "symbol":this.symbol,
            "color":this.color,
            "stations":list,
            "railpaths":rlist
        }
    }
}

export class Company{
    public name:string;
    readonly id:string;
    public type:number;
    public symbol:string;
    public color:Color;
    readonly trainlines:Map<string,TrainLine>;
    constructor(name:string,id:string,type:number,trainlines?:Map<string,TrainLine>,symbol?:string,color?:Color){
        this.name=name;
        this.id=id;
        this.type=type;
        if(typeof trainlines==="undefined"){
            this.trainlines=new Map<string,TrainLine>();
        }else{
            this.trainlines=trainlines;
        }
        if(typeof symbol!=="string"){
            this.symbol=id;
        }
        else{
            this.symbol=symbol;
        }
        if(typeof color==="undefined"){
            this.color=new Color("#000000");
        }
        else{
            this.color=color;
        }
    }

    /**
     * 文字列をパース
     * @param any 
     * @returns 
     */
    public static parse(any:any):{key:string,value:Company}{
        if(typeof any==="string"){
            return this.parse(JSON.parse(any));
        }
        else if(typeof any==="object"){
            const name=typeof any["name"]==="string"?any["name"]:"Company";
            if(typeof any["id"]!=="string"){
                throw Error("id is not set");
            }
            const id=any["id"];
            const type=typeof any["type"]==="number"?any["type"]:0;
            let trainlines=parsetoMap<TrainLine>(any["trainlines"],TrainLine.parse);
            return {key:id,value:new Company(name,id,type,trainlines,any["symbol"],typeof any["color"]==="string"?new Color(any["color"]):undefined)};
        }
        else{
            throw Error("input is not object");
        }
    }

    /**
     * 路線リストを返す
     */
    public getTrainlineIDs():string[]{
        let ids:string[]=[];
        this.trainlines.forEach((v,k)=>{ids.push(k)});
        return ids;
    }
    
    /**
     * 路線を返す
     * @param key 
     * @returns 路線
     */
    public getTrainline(key:string){
        return this.trainlines.get(key);
    }

    /**
     * 路線数を返す
     * @returns 
     */
    public getTrainlineCount(){
        return this.trainlines.size;
    }
    
    /**
     * 路線を追加
     * @param trainline 
     * @returns 路線ID
     */
    public addTrainline(trainline:TrainLine){
        const key=trainline.id;
        this.trainlines.set(key,trainline);
        return key;
    }

    /**
     * 事業者が所有する鉄道網のgeojson
     * @returns 
     */
    public getTrainlinesGeoJson(){
        let features:Feature<Point | MultiPoint | LineString | MultiLineString | Polygon | MultiPolygon, GeoJsonProperties>[]=[];
        this.trainlines.forEach((v)=>{
            features.push(...v.toGeojson().features);
        })
        return turf.featureCollection(features);
    }

    /**
     * JSON化
     * @returns Json
     */
    toJSON(){
        let list:TrainLine[]=[];
        this.trainlines.forEach((v)=>{
            list.push(v);
        })
        return{
            "name":this.name,
            "id":this.id,
            "type":this.type,
            "symbol":this.symbol,
            "color":this.color,
            "trainlines":list
        }
    }
}

export class Traind{
    readonly trainnumber:string;
    private acceralation:number;
    public interval:number;

    private path:RailPath;
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

    constructor(trainnumber:string,acceralation:number,p:RailPath,color:Color,interval=100){
        this.trainnumber=trainnumber;
        this.acceralation=acceralation;
        this.interval=interval;
        this.color=color;

        this.path=p;
    }

    public ani(timestamp:number,bound:mapboxgl.LngLatBounds,zoom:number){
        if(timestamp<this.nextframe){
            return null;
        }

        if(zoom<13){
            return null;
        }


        let d=this.path.length()*(Math.sin(timestamp*this.acceralation)+1)/2;
        const pos=this.path.getPos(d);
        const param:GeoJsonProperties={
            "color":this.color.toString()
        };
        if(bound.contains({lat:pos.lat,lng:pos.lng})){
            if(15<zoom){
                const features:Feature<any>[]=[];
                if(this.car%2==0){
                    d-=(this.carlen*(Math.floor(this.car/2)-1/2)*0.001);
                }
                else{
                    d-=(this.carlen*(Math.floor(this.car/2))*0.001);
                }

                for(let i=0;i<this.car;i++){
                    const carpos=this.path.getPos(d);
                    const geo=turf.geometry("Point",[carpos.lng,carpos.lat]);
                    features.push(turf.feature(geo,param));
                    d+=this.carlen*0.001;
                }
                return features;
            }
            else{

                const geo=turf.geometry("Point",[pos.lng,pos.lat]);
                const feature=turf.feature(geo,param);
                return [feature];
            }
        }
        this.nextframe=timestamp+1000+Math.floor(d*10000)%1000;
            return null;
    }
}