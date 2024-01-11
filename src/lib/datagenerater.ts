import { readFileSync, writeFileSync } from "fs";
import { Company, Pos, RailPath, Station, TrainLine, parsetoMap } from "./railway";
import { neatJSON } from "neatjson";
import { priority_queue } from "./PriorityQueue";
import { DayType, TimeTable, Train, TrainRoute } from "./timetable";
import { Feature } from "geojson";
import * as turf from "@turf/turf";

function makedata(){
    const data=readFileSync("resource/N02-22_RailroadSection.geojson",{encoding:"utf-8"})

    const features=JSON.parse(data)["features"]


    let companies=new Map<string,Company>();

    let companies_id=new Map<string,string>();

    for(let i=0;i<features.length;i++){
        const name=features[i]["properties"]["N02_004"];

        if(typeof companies_id.get(name)==="undefined"){
            const key=("0000"+companies_id.size.toString()).slice(-4);
            companies_id.set(name,key);
        }
    }

    for(let i=0;i<features.length;i++){
        const cname=features[i]["properties"]["N02_004"];
        const tname=features[i]["properties"]["N02_003"];
        const cid=companies_id.get(cname);
        if(typeof cid==="string"){
            const cc=companies.get(cid);
            if(typeof cc==="undefined"){
                const comp=new Company(cname,cid,features[i]["properties"]["N02_002"]);
                const trainline=new TrainLine(tname,"0000",parseInt(features[i]["properties"]["N02_001"]));
                const path=new RailPath(features[i]["geometry"]["coordinates"],"0000");
                trainline.addRailPath(path);
                comp.addTrainline(trainline);
                companies.set(cid,comp);
            }
            else{
                const trainlines=cc.getTrainlineIDs();
                let trainline:TrainLine|undefined=undefined;
                for(let i=0;i<trainlines.length;i++){
                    const t=cc.getTrainline(trainlines[i]);
                    if(t?.name==tname){
                        trainline=t;
                        break;
                    }
                }
                if(typeof trainline==="undefined"){
                    trainline=new TrainLine(tname,("0000"+cc.getTrainlineCount().toString()).slice(-4),parseInt(features[i]["properties"]["N02_001"]));
                    const path=new RailPath(features[i]["geometry"]["coordinates"],"0000");
                    trainline.addRailPath(path);
                    cc.addTrainline(trainline);
                }
                else{
                    const path=new RailPath(features[i]["geometry"]["coordinates"],("0000"+trainline.getRailPathsCount().toString()).slice(-4));
                    trainline.addRailPath(path);
                }
            }
        }
    }


    const stationdata=readFileSync("resource/N02-22_Station.geojson",{encoding:"utf-8"});
    const stationfeatures=JSON.parse(stationdata)["features"];
    console.log(stationfeatures)

    for(let i=0;i<stationfeatures.length;i++){
        const cname=stationfeatures[i]["properties"]["N02_004"];
        const tname=stationfeatures[i]["properties"]["N02_003"];
        const sname=stationfeatures[i]["properties"]["N02_005"];
        const uid=stationfeatures[i]["properties"]["N02_005c"];
        const gid=stationfeatures[i]["properties"]["N02_005g"];
        const geo=new RailPath(stationfeatures[i]["geometry"]["coordinates"],"00").thinning(1000000);
        const cid=companies_id.get(cname);
        if(typeof cid==="string"){
            const cc=companies.get(cid)!;
            
            const trainlines=cc.getTrainlineIDs();
            let trainline:TrainLine|undefined=undefined;
            for(let i=0;i<trainlines.length;i++){
                const t=cc.getTrainline(trainlines[i]);
                if(t?.name==tname){
                    trainline=t;
                    break;
                }
            }
            let location:string="0000";
            trainline!.railpaths.forEach((v)=>{
                if((v.first().issame(geo.first())&&v.end().issame(geo.end()))||(v.end().issame(geo.first())&&v.first().issame(geo.end()))){
                    location=v.id;
                    v.railtype="station";
                }
            });

            if(trainline?.stations.has(uid)){
                trainline.stations.get(uid)?.locations.push(location);
            }
            else{
                const station=new Station(sname,uid,gid,[location]);
                trainline?.stations.set(uid,station);
            }


            
        }
    }




    let list:Company[]=[]
    companies.forEach((v)=>{
        list.push(v);
    })
    const json=JSON.stringify(list);
    const njson=neatJSON(JSON.parse(json),{wrap:100000,indent:"    "});
    writeFileSync("resource/Rail.json",njson,{encoding:"utf-8"});

    console.log("write");

    const comapnys=parsetoMap<Company>(njson,Company.parse);
    console.log(comapnys)
}

function geojsontorailpaths(geojson:string){
    const json=JSON.parse(geojson)["features"];
    const r:RailPath[]=[];
    for(let i=0;i<json.length;i++){
        const f=json[i];
        r.push(
            new RailPath(f["geometry"]["coordinates"],f["properties"]["id"],f["properties"]["railtype"],f["properties"]["track"])
        )
    }

    return r;
}

/**
 * ルート生成
 */
function getRoute(t:TrainLine,s:string[],times:string[]){

    const G=new Map<string,{s:string,d:number}[]>();

    t.railpaths.forEach((r)=>{
        const d=r.length();
        const h=r.first().toString();
        const e=r.end().toString();
        if(G.has(h)){
            G.get(h)!.push({s:e,d:d});
        }
        else{
            G.set(h,[{s:e,d:d}]);
        }
        if(G.has(e)){
            G.get(e)!.push({s:h,d:d});
        }
        else{
            G.set(e,[{s:h,d:d}]);
        }
    });

    t.stations.forEach((s)=>{
        for(let i=0;i<s.locations.length;i++){
            const r=t.railpaths.get(s.locations[i])!;
            G.set(s.id+"."+i.toString(),[]);
            G.get(r.first().toString())!.push({s:(s.id+"."+i.toString()),d:100000});
            G.get(r.end().toString())!.push({s:(s.id+"."+i.toString()),d:100000});
        }
    })

    for(let i=0;i<s.length;i++){
        if(!s[i].match(/\d{6}\.\d{1,100}/)){
            s[i]+=".0";
        }
    }

    const tt:TrainRoute[]=[];

    for(let i=0;i<s.length-1;i++){
        const [stationid,index]=s[i].split(".");
        const rid=t.stations.get(stationid)!.locations[parseInt(index)];
        const start=t.railpaths.get(rid)!;
        const q=new priority_queue<{s:string,d:number}>((a,b)=>{return a.d-b.d});
        const distance=new Map<string,number>();
        const route=new Map<string,string>();
        G.forEach((v,k)=>{
            distance.set(k,1000000000);
        });
        distance.set(start.first().toString(),0);
        distance.set(start.end().toString(),0);
        q.insert({d:0,s:start.first().toString()});
        q.insert({d:0,s:start.end().toString()});

        while(!q.empty()){
            const from=q.top();
            q.pop();

            for(let i=0;i<G.get(from.s)!.length;i++){
                const to=G.get(from.s)![i];
                const d=from.d+to.d;
                if(d<distance.get(to.s)!){
                    route.set(to.s,from.s);
                    distance.set(to.s,d);
                    q.insert({s:to.s,d});
                }
            }
        }

        const reversed:string[]=[s[i+1]];
        while(route.has(reversed[reversed.length-1])){
            reversed.push(route.get(reversed[reversed.length-1])!);
        }

        const routemap:{id:string,direction:-1|1}[]=[{id:t.stations.get(stationid)!.locations[parseInt(index)],
            direction:
                t.railpaths.get(t.stations.get(stationid)!.locations[parseInt(index)])!.end().toString()==reversed[reversed.length-1]?1:-1
        }];

        for(let i=reversed.length-1;0<i;i--){

            t.railpaths.forEach((v,k)=>{
                if(v.first().toString()==reversed[i]&&v.end().toString()==reversed[i-1]){
                    routemap.push({id:k,direction:1});
                }
                else if(v.first().toString()==reversed[i-1]&&v.end().toString()==reversed[i]){
                    routemap.push({id:k,direction:-1});
                }
            })
        }

        const [did,dindex]=reversed[0].split(".");
        routemap.push({id:t.stations.get(did)!.locations[parseInt(dindex)],
            direction:
                t.railpaths.get(t.stations.get(did)!.locations[parseInt(dindex)])!.first().toString()==reversed[1]?1:-1
        })
        tt.push(new TrainRoute(stationid,parseInt(index),TrainRoute.stringtoTime(times[i])+10000,TrainRoute.stringtoTime(times[i+1])-10000,routemap));
    }

    return tt;

    //console.log(JSON.stringify(tt));

    //console.log(JSON.stringify(Object.fromEntries(G),null,4))
}

/*
const rawdata=readFileSync("resource/Rail.json",{encoding:"utf-8"});
const data=parsetoMap<Company>(rawdata,Company.parse);
writeFileSync("test.geojson",JSON.stringify(data.get("aikanrailway")?.getTrainlinesGeoJson().features,null,4));
//*/

function makeGeojson(){
    const rawdata=readFileSync("resource/Rail.json",{encoding:"utf-8"});
    const data=parsetoMap<Company>(rawdata,Company.parse);
    
    const rails:Feature<any>[]=[];  

    data.forEach((v)=>{
        rails.push(...v.getTrainlinesGeoJson().features);
    });

    writeFileSync("resource/Rail.geojson",JSON.stringify(turf.featureCollection(rails)),{encoding:"utf-8"})
}

function makeTrains(t:TrainLine,c:string){
    const timetableRaw=readFileSync("resource/timetable/aikanjikoku-to-okazaki.csv",{encoding:"utf-8"});
    const timetabledata:string[][]=timetableRaw.split(",\r\n").map((s)=>{return s.split(",")});
    const trains:Train[]=[];
    for(let i=3;i<timetabledata[0].length;i++){
        const trainnumber=timetabledata[0][i];
        const wc=timetabledata[1][i].split("両")[0];
        const sc=timetabledata[2][i].split("両")[0];
        const hc=timetabledata[3][i].split("両")[0];

        const stations:string[]=[];
        const times:string[]=[];

        for(let j=4;j<timetabledata.length;j++){
            if(timetabledata[j][i]==""){
                continue;
            }
            if(timetabledata[j][0]==""){
                continue;
            }

            stations.push(timetabledata[j][0]);
            times.push(timetabledata[j][i]);
        }
        const timetable=getRoute(t,stations,times);

        if(wc=="4"||sc=="4"||hc=="4"){
            const days:DayType[]=[];
            if(wc=="4"){
                days.push("Weekday");
            }
            if(sc=="4"){
                days.push("Saturday");
            }
            if(hc=="4"){
                days.push("Holiday");
            }
            const train=new Train(trainnumber,timetable,days,trainnumber,"Local","Okazaki",4,20,t.color);
            trains.push(train);
        }
        if(wc=="2"||sc=="2"||hc=="2"){
            const days:DayType[]=[];
            if(wc=="2"){
                days.push("Weekday");
            }
            if(sc=="2"){
                days.push("Saturday");
            }
            if(hc=="2"){
                days.push("Holiday");
            }
            const train=new Train(trainnumber,timetable,days,trainnumber,"Local","Okazaki",2,20,t.color);
            trains.push(train);
        }

        
    }

    writeFileSync("resource/timetable/aikanjikoku-to-okazaki.json",JSON.stringify({
        c:c,
        t:t.id,
        tt:trains
    },null,4),{encoding:"utf-8"});
    //console.log();
}

/*
const rawdata=readFileSync("resource/Rail.json",{encoding:"utf-8"});
const data=parsetoMap<Company>(rawdata,Company.parse);
makeTrains(data.get("aikanrailway")!.getTrainline("aikanrailway")!,"aikanrailway")
//*/

const rawdata=readFileSync("resource/Rail.json",{encoding:"utf-8"});
const data=parsetoMap<Company>(rawdata,Company.parse);
const t=data.get("jrwest")!.getTrainline("sanyoshinkansen")!;
const m=new Map<string,string>();
t.stations.forEach((s)=>{
    m.set(s.name,s.id);
})

console.log(JSON.stringify(Object.fromEntries(m),null,4));