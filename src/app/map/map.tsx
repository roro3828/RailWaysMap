'use client';
import { useEffect, useState, useRef } from 'react';
import mapboxgl, { GeoJSONSource } from 'mapbox-gl';
import MapboxLanguage from '@mapbox/mapbox-gl-language';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Company, RailPath, Train, parsetoMap } from '@/lib/railway';
import * as turf from "@turf/turf";
import { Feature } from 'geojson';
import animation from '@/lib/animation';
import {GET} from "@/app/api/route"



export default function SimpleMap() {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_KEY??"";
    const mapContainer = useRef(null);
    const [map, setMap] = useState<mapboxgl.Map|null>(null);

    /**
     * 鉄道データ取得
     */    
    const [railways, setData]=useState<Map<string,Company>|null>(null);
    const [isLoading, setLoading]=useState(true);
    useEffect(()=>{
        fetch(`/api`).then((response)=>response.json()).then((value)=>{
            setData(parsetoMap<Company>(value["data"],Company.parse));
            loadSource("fetch");
        });
    },[map]);

    useEffect(() => {
        const initializeMap = ({
            setMap,
            mapContainer,
        }: {
            setMap: any;
            mapContainer: any;
        }) => {
            const map = new mapboxgl.Map({
                container: mapContainer.current,
                center: [139.7670516, 35.6811673], // 東京駅を初期値点として表示（緯度、経度を指定）
                zoom: 15,
                maxPitch:0,
                style: 'mapbox://styles/mapbox/light-v10',
            });
            // 言語変更設定参考
            // defaultLanguageとしてjaを指定
            const language = new MapboxLanguage({ defaultLanguage: 'ja' });
            map.addControl(language);

            map.on('load', () => {
                setMap(map);
                map.resize();
                loadSource("map");
            });

            map.on("click",(e)=>{
                console.log(e.lngLat);
                const f=map.queryRenderedFeatures(e.point);
                for(let i=0;i<f.length;i++){
                    console.log(f[i].properties);
                }
            })
        };

        if (!map) initializeMap({ setMap, mapContainer });
    }, [map]);

    if(isLoading){
        return(
            <>
                <div ref={mapContainer} className='w-full h-screen'></div>
                <div>Loading...</div>
            </>
        )
    }
    else{
        return (
            <>
                <div ref={mapContainer} className='w-full h-screen' />
            </>
        );
    }


    function loadSource(c:string){
        if(map==null||railways==null){
            return;
        }
        if(!isLoading){
            return;
        }
        console.log(`load from ${c}`);
        const rails:Feature<any>[]=[];  

        railways.forEach((v)=>{
            rails.push(...v.getTrainlinesGeoJson().features);

            v.trainlines.forEach((t)=>{
                t.railpaths.forEach((r)=>{
                    animation.start(new Train(v.id+"-"+t.id+r.id,0.0001,r,t.color));
                })
            })
        });

        const railsourceid="rail";
        map.addSource(
            railsourceid,
            {
                "type":"geojson",
                "data":turf.featureCollection(rails)
            }
        );
        map.addLayer({
            "id":railsourceid,
            "type":"line",
            "source":railsourceid,
            "layout":{
                "line-join":"round",
                "line-cap":"round",
                "visibility":"visible"
            },
            "paint":{
                "line-width":["get","width"],
                "line-color":["get","color"]
            }
        });

        const animationsourceid="ani";
        map.addSource(
            animationsourceid,
            {
                "type":"geojson",
                "data":{
                    "type": "FeatureCollection",
                    "features": []
                }
            }
        )
        map.addLayer({
            'id':animationsourceid,
            'source':animationsourceid,
            'type': 'circle',
            "layout":{
                "visibility":"visible"
            },
            'paint': {
                'circle-radius': 10,
                'circle-color': ["get","color"],
            }
        });
        animation.init(map,animationsourceid);
        setLoading(false);

    }
}
