import { NextRequest } from "next/server";
import { ResponseData } from "@/lib/response";
import { readFileSync,existsSync } from "fs";

export async function GET(request:NextRequest,{params}:{params:{slug:string}}) {

    if(existsSync(`resource/timetable/${params.slug}.json`)){
        const data=readFileSync(`resource/timetable/${params.slug}.json`,{encoding:"utf-8"});
        const json=JSON.parse(data);
        return ResponseData(200,json);
    }
    return ResponseData(404,`${params.slug} not found`);
}
