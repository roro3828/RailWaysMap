'use client';
import { useEffect, useState, useRef } from 'react';
import mapboxgl, { GeoJSONSource } from 'mapbox-gl';
import MapboxLanguage from '@mapbox/mapbox-gl-language';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Company, RailPath, parsetoMap } from '@/lib/railway';
import * as turf from "@turf/turf";
import { Feature } from 'geojson';
import animation from '@/lib/animation';
import { Train, TrainRoute } from '@/lib/timetable';


export default function SimpleMap() {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_KEY??"";
    const mapContainer = useRef(null);
    const [map, setMap] = useState<mapboxgl.Map|null>(null);
    const [isLoading,setLoading]=useState<boolean>(true);

    /**
     * 鉄道データ取得
     */    
    const [railways, setRailways]=useState<Map<string,Company>|null>(null);

    useEffect(()=>{
        if(railways!=null){
            return;
        }
        fetch(`/api`).then((response)=>response.json()).then((value)=>{
            setRailways(parsetoMap<Company>(value["data"],Company.parse));
        });
    },[railways]);

    /**
     * 時刻表データ取得
     */
    const [paths,setPaths]=useState<string[]|null>(null);
    useEffect(()=>{
        if(paths!=null){
            return;
        }
        fetch('/data/timetables').then((response)=>response.json()).then((value)=>{
            setPaths(value["data"]);
        });
    },[paths]);



    useEffect(() => {
        const initializeMap = ({
            setMap,
            mapContainer,
        }: {
            setMap: Function;
            mapContainer: any;
        }) => {
            const map = new mapboxgl.Map({
                container: mapContainer.current,
                center: [136.88182959193895,35.17103308865671],
                zoom: 15,
                maxPitch:0,
                minZoom:5,
                maxZoom:20,
                style: 'mapbox://styles/roro3828/clqvrjl0v005c01pmgmb62axt',
            });
            // 言語変更設定参考
            // defaultLanguageとしてjaを指定
            const language = new MapboxLanguage({ defaultLanguage: 'ja' });
            map.addControl(language);

            map.on('load', () => {
                const animationsourceid="ani";
                map.addSource(
                    animationsourceid,
                    {
                        "type":"geojson",
                        "data":{
                            "type": "FeatureCollection",
                            "features": animation.getFeatures()
                        }
                    }
                )
                animation.mapsource=map.getSource(animationsourceid) as mapboxgl.GeoJSONSource;

                map.loadImage("/train.png",(error,image)=>{
                    if(error){
                        throw error;
                    }

                    map.addImage("train",image!);

                    map.addLayer({
                        'id':animationsourceid,
                        'source':animationsourceid,
                        'type': "symbol",
                        "layout":{
                            "visibility":"visible",
                            "icon-image":"train",
                            "icon-size":1,
                            "icon-rotate":["get","angle"],
                            "icon-rotation-alignment":"map",
                            "icon-allow-overlap":true
                        }
                    });
                });
                setMap(map);
                map.resize();
            });

            map.on("click",(e)=>{
                const result=map.queryRenderedFeatures(e.point,{layers:["ani"]});

                if (result.length === 0) {
                    return;
                }
                const popup = new mapboxgl.Popup({ offset: 20 })
                .setLngLat(e.lngLat)
                .setText(result[0].properties!.angle)
                .addTo(map);
            })
        };

        if (!map) initializeMap({ setMap, mapContainer });
    }, [map]);

    useEffect(()=>{
        loadSource();
    },[map,railways,paths]);

    return (
        <>
            <div className='z-50 w-full h-screen bg-slate-800 transition-all duration-100' hidden={!isLoading}>
                <span className=' align-middle text-white text-5xl'>
                    Loading<div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"/>
                </span>
            </div>
            <div ref={mapContainer} className='w-full h-screen' />
        </>
    );


    function loadSource(){
        if(map==null||railways==null||paths==null){
            return;
        }
        if(!isLoading){
            return;
        }
        console.log(`load`);
        const animationsourceid="ani";
        
        console.log(map.getSource("ani"))
        animation.init(map,animationsourceid);
        setLoading(false);
        loadTrains();
    }

    function loadTrains(){
        for(let i=0;i<paths!.length;i++){
            console.log(paths![i]);
            fetch(`/data/timetables/${paths![i]}`).then((response)=>response.json()).then((value)=>{
                const trainline=railways!.get(value["data"]["c"])!.getTrainline(value["data"]["t"])!;
                const trains=value["data"]["tt"] as any[];
                for(let t=0;t<trains.length;t++){
                    const train=Train.parse(trains[t]);
                    train.trainline=trainline;
                    animation.start(train);
                }
            });
        }
    }
}

