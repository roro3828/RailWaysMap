import { readFileSync, writeFileSync } from "fs";
import { Company, Pos, RailPath, Station, TrainLine, parsetoMap } from "./railway";
import { neatJSON } from "neatjson";
import { priority_queue } from "./PriorityQueue";
import { TimeTable, Train, TrainRoute } from "./timetable";
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

    console.log(JSON.stringify(r));
}

/**
 * ルート生成
 */
function getRoute(){
    const rawdata=readFileSync("resource/Rail.json",{encoding:"utf-8"});
    const data=parsetoMap<Company>(rawdata,Company.parse);
    const t=data.get("aikanrailway")!.getTrainline("aikanrailway")!;
    //console.log(JSON.stringify(t.toGeojson().features));

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

    const s=["006252","006208","006171","006127","006090","006025","005195"];
    //const s=["003768","006912","003768"];

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
        tt.push(new TrainRoute(s[i] as `${string}.${string}`,"00:00","00:00",routemap));
    }

    console.log(JSON.stringify(tt));

    //console.log(JSON.stringify(Object.fromEntries(G),null,4))
}

//geojsontorailpaths(readFileSync("C:\\Users\\3828\\Downloads\\map.geojson",{"encoding":"utf-8"}))
/*
const rawdata=readFileSync("resource/Rail.json",{encoding:"utf-8"});
const data=parsetoMap<Company>(rawdata,Company.parse);
writeFileSync("test.geojson",JSON.stringify(data.get("aikanrailway")?.getTrainlinesGeoJson().features,null,4));
//*/

function testtimetable(){
    const rawdata=readFileSync("resource/Rail.json",{encoding:"utf-8"});
    const data=parsetoMap<Company>(rawdata,Company.parse);
    const t=data.get("aikanrailway")!.getTrainline("aikanrailway")!;
    const tt=Train.parse({
        "id":"1101H",
        "w":["Weekday"],
        "n":"1101H",
        "y":"Local",
        "d":"Okazaki",
        "os":"006025.0",
        "c":2,
        "pt":[],
        "nt":[
            "1115H"
        ],
        "tt":[
            {
                "s": "006252.0",
                "a": "00:16",
                "d": "00:15",
                "r": [
                    {
                        "id": "0045",
                        "dir": 1
                    },
                    {
                        "id": "0039",
                        "dir": 1
                    },
                    {
                        "id": "0037",
                        "dir": 1
                    },
                    {
                        "id": "0040",
                        "dir": 1
                    }
                ]
            },
            {
                "s": "006208.0",
                "a": "00:18",
                "d": "00:17",
                "r": [
                    {
                        "id": "0040",
                        "dir": 1
                    },
                    {
                        "id": "0041",
                        "dir": 1
                    },
                    {
                        "id": "0042",
                        "dir": 1
                    }
                ]
            },
            {
                "s": "006171.0",
                "a": "00:20",
                "d": "00:19",
                "r": [
                    {
                        "id": "0042",
                        "dir": 1
                    },
                    {
                        "id": "0044",
                        "dir": 1
                    },
                    {
                        "id": "0046",
                        "dir": 1
                    }
                ]
            },
            {
                "s": "006127.0",
                "a": "00:22",
                "d": "00:21",
                "r": [
                    {
                        "id": "0046",
                        "dir": 1
                    },
                    {
                        "id": "0043",
                        "dir": 1
                    },
                    {
                        "id": "0030",
                        "dir": 1
                    }
                ]
            },
            {
                "s": "006090.0",
                "a": "00:24",
                "d": "00:23",
                "r": [
                    {
                        "id": "0030",
                        "dir": 1
                    },
                    {
                        "id": "0025",
                        "dir": -1
                    },
                    {
                        "id": "0015",
                        "dir": -1
                    }
                ]
            },
            {
                "s": "006025.0",
                "a": "00:26",
                "d": "00:25",
                "r": [
                    {
                        "id": "0015",
                        "dir": -1
                    },
                    {
                        "id": "0019",
                        "dir": 1
                    },
                    {
                        "id": "0016",
                        "dir": -1
                    },
                    {
                        "id": "0026",
                        "dir": -1
                    },
                    {
                        "id": "0024",
                        "dir": -1
                    },
                    {
                        "id": "0007",
                        "dir": -1
                    },
                    {
                        "id": "0020",
                        "dir": -1
                    },
                    {
                        "id": "0006",
                        "dir": -1
                    },
                    {
                        "id": "0012",
                        "dir": -1
                    },
                    {
                        "id": "0008",
                        "dir": -1
                    },
                    {
                        "id": "0023",
                        "dir": -1
                    },
                    {
                        "id": "0022",
                        "dir": 1
                    },
                    {
                        "id": "0000",
                        "dir": 1
                    },
                    {
                        "id": "0013",
                        "dir": -1
                    },
                    {
                        "id": "0002",
                        "dir": -1
                    },
                    {
                        "id": "0032",
                        "dir": 1
                    },
                    {
                        "id": "0001",
                        "dir": 1
                    },
                    {
                        "id": "0011",
                        "dir": -1
                    },
                    {
                        "id": "0036",
                        "dir": -1
                    },
                    {
                        "id": "0033",
                        "dir": -1
                    },
                    {
                        "id": "0035",
                        "dir": 1
                    },
                    {
                        "id": "0017",
                        "dir": 1
                    },
                    {
                        "id": "0010",
                        "dir": 1
                    },
                    {
                        "id": "0009",
                        "dir": -1
                    },
                    {
                        "id": "0021",
                        "dir": -1
                    },
                    {
                        "id": "0004",
                        "dir": -1
                    },
                    {
                        "id": "0031",
                        "dir": -1
                    },
                    {
                        "id": "0028",
                        "dir": -1
                    },
                    {
                        "id": "0005",
                        "dir": -1
                    },
                    {
                        "id": "0034",
                        "dir": -1
                    },
                    {
                        "id": "0018",
                        "dir": -1
                    },
                    {
                        "id": "0027",
                        "dir": -1
                    },
                    {
                        "id": "0014",
                        "dir": -1
                    },
                    {
                        "id": "0003",
                        "dir": -1
                    },
                    {
                        "id": "0029",
                        "dir": 1
                    }
                ]
            }
        ]
    });

    tt.trainline=t;

    for(let i=0;i<300;i++){
        tt.ani(i*60*100);
    }

}

function makeGeojson(){
    const rawdata=readFileSync("resource/Rail.json",{encoding:"utf-8"});
    const data=parsetoMap<Company>(rawdata,Company.parse);
    
    const rails:Feature<any>[]=[];  

    data.forEach((v)=>{
        rails.push(...v.getTrainlinesGeoJson().features);
    });

    writeFileSync("resource/Rail.geojson",JSON.stringify(turf.featureCollection(rails)),{encoding:"utf-8"})
}

testtimetable();