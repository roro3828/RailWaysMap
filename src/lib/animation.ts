import mapboxgl from "mapbox-gl";
import { Pos, Train } from "./railway";
import { Feature, FeatureCollection, GeoJsonProperties, Geometry, LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon } from "geojson";
import { featureCollection } from "@turf/turf";

type Animation={
    instances:Map<string,Train>,
    initialized:boolean,
    map:mapboxgl.Map|null,
    sourceid:string,
    init:(map:mapboxgl.Map,sourceid:string)=>void,
    isActive:(id:string)=>boolean,
    start:(train:Train)=>void,
    stop:(id:string)=>void
};

const animation:Animation={
    instances:new Map<string,Train>(),
    initialized:false,
    map:null,
    sourceid:"ani",
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
        animation.instances.set(train.trainnumber,train);
    },
    stop(id:string){
        animation.instances.delete(id);
    }
}

export default animation;

function loop(){
    const map=animation.map!;
    const zoom=map.getZoom();
    const bbox=map.getBounds();
    const mapsource=map.getSource(animation.sourceid) as mapboxgl.GeoJSONSource;
    const currenttime=Date.now();

    const features:Feature<any>[]=[];
    animation.instances.forEach((v)=>{
        const f=v.ani(currenttime,bbox,zoom);
        if(f!=null){
            features.push(...f);
        }
    });
    mapsource.setData(featureCollection(features));


    requestAnimationFrame(loop);
}