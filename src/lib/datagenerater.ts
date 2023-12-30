import { readFileSync, writeFileSync } from "fs";
import { Company, Pos, RailPath, Station, Train, TrainLine, parsetoMap } from "./railway";
import { neatJSON } from "neatjson";

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
    writeFileSync("resource/Rail.geojson",njson,{encoding:"utf-8"});

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
geojsontorailpaths(readFileSync("C:\\Users\\3828\\Downloads\\map.geojson",{"encoding":"utf-8"}))
/*
const rawdata=readFileSync("resource/Rail.geojson",{encoding:"utf-8"});
const data=parsetoMap<Company>(rawdata,Company.parse);
writeFileSync("test.geojson",JSON.stringify(data.get("aikanrailway")?.getTrainlinesGeoJson().features,null,4));
//*/