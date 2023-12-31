export class priority_queue<T> {
    private comparator:(a:T,b:T)=>number;
    private node:T[];

    constructor(comparator:(l:T,r:T)=>number){
        this.node=[];
        this.comparator=comparator;
    }

    public empty(){
        return this.node.length<=0;
    }

    public size(){
        return this.node.length;
    }

    public top(){
        return this.node[0];
    }

    public pop(){
        const tmp=this.node[0];
        this.node[0]=this.node[this.size()-1];
        this.node.pop();
        this.node.sort(this.comparator);
        return tmp;
    }

    public insert(t:T){
        this.node.push(t);
        this.node.sort(this.comparator);
    }
}
