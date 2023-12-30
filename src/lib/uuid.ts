import { webcrypto } from "crypto";

/**
 * UUID
 */
export class UUID{

    /**
     * UUID0
     */
    private uuid0:string;
    private uuid1:string;
    private uuid2:string;
    private uuid3:string;
    private uuid4:string;

    /**
     * ランダムなUUIDを生成
     */
    constructor();
    /**
     * 文字列からUUIDを生成
     * @param uuid UUID
     */
    constructor(uuid:`${string}-${string}-${string}-${string}-${string}`);
    /**
     * 文字列からUUIDを生成
     * @param uuid UUID
     */
    constructor(uuid:string);
    constructor(any?:any){
        if(typeof any==="undefined"){
            any=webcrypto.randomUUID();
        }
        const uuids=any.split("-");
        if(
            uuids.length===5 &&
            uuids[0].length===8 &&
            uuids[1].length===4 &&
            uuids[2].length===4 &&
            uuids[3].length===4 &&
            uuids[4].length===12
            ){
                this.uuid0=uuids[0];
                this.uuid1=uuids[1];
                this.uuid2=uuids[2];
                this.uuid3=uuids[3];
                this.uuid4=uuids[4];
        }
        else{
            throw Error("UUID is invalid");
        }
    }

    /**
     * 文字列のUUIDを取得
     * @returns UUID
     */
    public toString():`${string}-${string}-${string}-${string}-${string}`{
        return `${this.uuid0}-${this.uuid1}-${this.uuid2}-${this.uuid3}-${this.uuid4}`;
    }
    
    /**
     * JSON文字列化
     * @returns String
     */
    toJSON(){
        return this.toString();
    }

    /**
     * 文字列がUUIDかどうか
     * @param uuid 文字列
     * @returns bool
     */
    public static isUUID(uuid:string){
        try{
            new UUID(uuid);
            return true;
        }
        catch{
            return false;
        }
    }
}