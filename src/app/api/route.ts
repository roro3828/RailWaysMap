import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ResponseData } from "@/lib/response";
import { readFileSync } from "fs";
import { Company, parsetoMap } from "@/lib/railway";

export async function POST(request: NextRequest) {
    
    
}

export async function GET(request: NextRequest) {
    const data=readFileSync("resource/Rail.json",{encoding:"utf-8"});
    const ddd=parsetoMap<Company>(data,Company.parse);

    let list:Company[]=[]
    ddd.forEach((v)=>{
        list.push(v);
    })
    return ResponseData(200,list);
}
