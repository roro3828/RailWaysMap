export class TimeTable{

}

type DayType="Weekday"|"Saturday"|"Holiday";

export class Train{
    readonly id:string;
    /**
     * 平日か休日
     */
    readonly daytype:DayType[];
    readonly trainnumber:string;
    /**
     * 種別、急行か普通か特急か
     */
    readonly type:string;
    /**
     * 行先
     */
    readonly destination:string;
    /**
     * 始発駅  
     * 駅コード.乗り場
     */
    readonly originstation:`${string}.${string}`;
    /**
     * 両数
     */
    readonly carcount:number;


    constructor(id:string,daytype:DayType,trainnumber:string,type:string){
    }
}

export class TrainRoute{
    readonly station:`${string}.${string}`;
    readonly arrivaltime:string;
    readonly departuretime:string|null;
    readonly route:{id:string,direction:-1|1};
}