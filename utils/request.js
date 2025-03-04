const {URL}=require('url');
const http=require('http');
const https=require('https');
const zlib=require('zlib');
const fs=require('fs');

function request(method,url,headers,body)
{
    return new Promise((resolve,reject)=>
    {
        const isHTTP=new URL(url).protocol=='http:';
        
        headers=Object.assign(
        {
            'accept-encoding': 'gzip, deflate, br',
            'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
        },
        headers);
        
        const req=(isHTTP?http:https).request(url,{
            method,
            headers
        },res=>
        {
            let data=[];
            res.on('error',reject);
            res.on('data',c=>data.push(c));
            res.on('end',()=>
            {
                data=Buffer.concat(data);
                
                const encoding=[null,zlib.gunzipSync,zlib.inflateSync,zlib.brotliDecompressSync][['gzip','deflate','br'].indexOf(res.headers['content-encoding'])+1];
                
                if(encoding!==null)data=encoding(data);
                resolve(
                {
                    status:res.statusCode,
                    headers:res.headers,
                    body:data.toString()
                });
            });
        });
        req.on('error',reject);
        req.end(body);
    });
}

function CookieManager(){
    this.cookies=new Map();
    this.write=function(path){
        fs.writeFileSync(path,JSON.stringify(Array.from(this.cookies)));
    };
    this.read=function(path){
        if(fs.existsSync(path))this.cookies=new Map(JSON.parse(fs.readFileSync(path).toString()));
    };
    this.clean=function(){
        for (let [key, value] of this.cookies) {
            if(value.expireTime-Date.now()<0){
                this.cookies.delete(key);
            }
        }
    };
    this.cookieString=function(hostname){
        this.clean();
        return Array.from(this.cookies).filter(x=>{
            const domain=x.properties.domain;
            if(domain===undefined)return false;
            if(hostname==domain)return true;
            if(domain[0]=='.'){
                if(hostname.includes(domain)){
                    return true;
                }else if('.'+hostname==domain){
                    return true;
                }
            }
            return false;
        }).map(x=>x[0]+'='+encodeURIComponent(x[1].value)).join('; ');
    };
    this.set=function(str){
        const [[name,value],...properties]=str.split('; ').map(x=>Array.from(new URLSearchParams(x))[0]);
        const o={};
        properties.forEach(x=>o[x[0]]=x[1]);
        let expireTime=Infinity;
        if(o['expires']!==undefined)expireTime=Math.min(expireTime,new Date(o['expires']).getTime());
        if(o['Max-Age']!==undefined)expireTime=Math.min(expireTime,new Date(Date.now()+Number(o['Max-Age'])*1000).getTime());
        this.cookies.set(name,{
            value:value,
            properties:o,
            expireTime:expireTime,
        });
        this.clean();
    };
    this.setByRes=function(res){
        res.headers?.['set-cookie']?.forEach(x=>this.set(x));
    };
    return this;
}

