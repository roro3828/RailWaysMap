import mapboxgl from "mapbox-gl";
import { Pos } from "./railway";
import { Feature, FeatureCollection, GeoJsonProperties, Geometry, LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon } from "geojson";
import { featureCollection } from "@turf/turf";
import { Train } from "./timetable";

type Animation={
    instances:Map<string,Train>,
    initialized:boolean,
    map:mapboxgl.Map|null,
    sourceid:string,
    mapsource:mapboxgl.GeoJSONSource|null,
    init:(map:mapboxgl.Map,sourceid:string)=>void,
    isActive:(id:string)=>boolean,
    start:(train:Train)=>void,
    stop:(id:string)=>void,
    getFeatures:()=>Feature<any,GeoJsonProperties>[]
};

const animation:Animation={
    instances:new Map<string,Train>(),
    initialized:false,
    map:null,
    sourceid:"ani",
    mapsource:null,
    init(map:mapboxgl.Map,sourceid:string){
        if(!animation.initialized){
            animation.initialized=true;
            animation.map=map
            animation.sourceid=sourceid;
            loop();
        }
    },
    isActive(id:string){
        return animation.instances.has(id);
    },
    start(train:Train){
        animation.instances.set(train.id,train);
    },
    stop(id:string){
        animation.instances.delete(id);
    },
    getFeatures(){
        //const map=animation.map!;
        //const zoom=map.getZoom();
        //const bbox=map.getBounds();
        const currenttime=(Date.now()+32400000);

        const features:Feature<any>[]=[];
        animation.instances.forEach((v)=>{
            const f=v.ani(currenttime);
            if(f!=null){
                features.push(...f);
            }
        });

        return features;
    }
}

export default animation;

function loop(){
    if(animation.mapsource!=null){
        animation.mapsource.setData(featureCollection(animation.getFeatures()));
    }
    else{
        console.log("source is null");
    }

    requestAnimationFrame(loop);
}