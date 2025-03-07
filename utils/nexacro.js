const {XMLParser} = require('fast-xml-parser');

const parser = new XMLParser({
    ignoreAttributes:false,
    attributeNamePrefix:"@",
    isArray:()=>true,
    parseTagValue:false,
});

function parseNexacro(str){
    const xml=parser.parse(str);
    const root=xml.Root[0];
    const parameters={};
    root.Parameters[0].Parameter.forEach(tag=>{
        const id=tag['@id'][0],type=tag['@type'][0];
        let value=tag['#text'];
        switch(type){
            case 'string':break;
            case 'int':
            {
                value=Number(value);
            }
            break;
            default:
                console.warn(`unknown type: "${type}", parameter id: ${id}`);
        }
        parameters[id]=value;
    });

    const dataset=root.Dataset?.[0].Rows[0].Row.map(row=>{
        const result={};
        row.Col.forEach(col=>{
            const id=col['@id'][0];
            let value=col['#text'];
            result[id]=value;
        });
        return result;
    });

    return {
        parameters,
        data:dataset,
    };
}
exports.parseNexacro=parseNexacro;
