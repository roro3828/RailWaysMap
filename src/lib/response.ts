/**
 * {     
 * status:200,    
 * data:[data]    
 * }    
 * の形式でレスポンスを返す
 * @param status ステータスコード
 * @param data データ
 * @returns レスポンス
 */
export function ResponseData(status:number,data:any){
    const Data={
        status:status,
        data:data
    }
    return Response.json(Data,{status:status});
}