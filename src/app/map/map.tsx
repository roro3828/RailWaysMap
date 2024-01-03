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
                center: [136.88182959193895,35.17103308865671],
                zoom: 15,
                maxPitch:0,
                minZoom:5,
                style: 'mapbox://styles/roro3828/clqvrjl0v005c01pmgmb62axt',
            });
            // 言語変更設定参考
            // defaultLanguageとしてjaを指定
            const language = new MapboxLanguage({ defaultLanguage: 'ja' });
            map.addControl(language);

            map.on('load', () => {
                setMap(map);
                map.resize();const animationsourceid="ani";
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

    return (
        <>
            <div ref={mapContainer} className='w-full h-screen' />
        </>
    );


    function loadSource(c:string){
        if(map==null||railways==null){
            return;
        }
        if(!isLoading){
            return;
        }
        console.log(`load from ${c}`);
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
                    "s": "006025.0",
                    "d": "23:50",
                    "a": "23:59",
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
        tt.trainline=railways.get("aikanrailway")!.getTrainline("aikanrailway")!;
        animation.start(tt);

        const animationsourceid="ani";
        animation.init(map,animationsourceid);
        setLoading(false);

    }
}
