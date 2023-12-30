"use client"

import { Color } from "@/lib/color";
import { Pos, Station } from "@/lib/railway";
import { useState } from "react";

export default function MapPage() {

    const position = Pos.parse([137.1576, 34.97188]).googlemapformat();

    const station=Station.parse(
        {
            "name":"えき",
            "id":"001",
            "groupcode":"00001",
            "locations":["001"]
        }
    )

    return (
        <div className='flex flex-row  w-screen h-screen justify-center'>
        </div>
    )
}
