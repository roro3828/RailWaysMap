import { NextRequest } from "next/server";
import { ResponseData } from "@/lib/response";
import { readFileSync,existsSync } from "fs";

export async function GET(request:NextRequest) {

    if(existsSync(`resource/timetables.json`)){
        const data=readFileSync(`resource/timetables.json`,{encoding:"utf-8"});
        const json=JSON.parse(data);
        return ResponseData(200,json);
    }
    return ResponseData(400,`unknown Error.`);
}
