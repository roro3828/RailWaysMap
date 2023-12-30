import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ResponseData } from "@/lib/response";
import { readFileSync } from "fs";
import { Company, parsetoMap } from "@/lib/railway";


export async function GET(request: NextRequest) {
    const data=readFileSync("resource/N02-22_RailroadSection.geojson",{encoding:"utf-8"});
    return ResponseData(200,JSON.parse(data));
}
