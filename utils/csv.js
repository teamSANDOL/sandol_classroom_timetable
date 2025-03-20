function parseBuildings(str){
    const arr=str.split(/\r\n|\r|\n/).map(x=>x.trim());
    const result=[];
    arr.filter(x=>x.length>0).forEach(x=>{
        const a=x.split(',').map(x=>x.trim());
        result.push({
            name:a[0],
            aliases:a.slice(1).filter(x=>x.length>0),
        });
    });
    return result;
}
exports.parseBuildings=parseBuildings;
