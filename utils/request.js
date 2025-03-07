const {URL}=require('url');
const http=require('http');
const https=require('https');
const zlib=require('zlib');
const fs=require('fs');

function request(method,url,headers,option={},body)
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

        option=Object.assign(option,{
            method,
            headers
        });
        
        const req=(isHTTP?http:https).request(url,option,res=>
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
    this.cookieString=function(url){
        this.clean();
        
        url=new URL(url);

        const cookieMap=new Map();
        this.cookies.forEach((value,key)=>{
            const [name,domain,path]=JSON.parse(key);

            // 도메인 일치 여부 판단 로직
            {
                let sameDomain=false;
    
                // url과 쿠키의 도메인이 같을 시
                if(url.hostname==domain)sameDomain=true;
    
                // 쿠키가 하위 도메인에서도 유효할 때
                if(domain[0]=='.'){
    
                    // url이 쿠키의 도메인으로 끝날 시 유효
                    if(url.hostname.endsWith(domain))sameDomain=true;
    
                    // 하위 도메인이 아닌 url과 비교
                    else if('.'+url.hostname==domain)sameDomain=true;
                }
    
                // 같은 도메인의 쿠키가 아닐 시 종료
                if(!sameDomain)return;
            }

            // 경로 일치 여부 판단 로직
            {
                let samePath=false;

                // url과 쿠키의 경로가 같을 시
                if(url.pathname==path)samePath=true;

                let splitedCookiePath=path.split('/');
                const splitedUrlPath=url.pathname.split('/');

                // 쿠키의 경로가 / 로 끝날 때 끝의 빈 문자열 한개를 제거
                if(splitedCookiePath.at(-1).length==0)splitedCookiePath=splitedCookiePath.slice(0,-1);
                
                // url의 경로가 쿠키의 하위 경로일 때 유효
                if(splitedCookiePath.every((p,i)=>p==splitedUrlPath[i]))samePath=true;
    
                // 같은 경로의 쿠키가 아닐 시 종료
                if(!samePath)return;
            }
            
            // 같은 이름의 쿠키가 있다면
            if(cookieMap.has(name)){
                const [domain,path]=cookieMap.get(name);

                // 쿠키의 도메인이 기존의 도메인보다 짧을 시 종료
                if(url.hostname.length<domain.length)return;

                // 쿠키의 도메인이 같을 때, 기존의 경로보다 짧을 시 종료
                if(url.hostname.length==domain.length&&url.pathname.length<path.length)return;
            }

            cookieMap.set(name,[domain,path]);
        });
        return Array.from(cookieMap).map(([name,[domain,path]])=>{
            const cookie=this.cookies.get(JSON.stringify([name,domain,path]));
            return name+'='+encodeURIComponent(cookie.value);
        }).join('; ');
    };
    this.set=function(str,url){
        url=new URL(url);
        const [[name,value],...properties]=str.split('; ').map(x=>Array.from(new URLSearchParams(x))[0]);
        const o={};
        properties.forEach(x=>o[x[0].toLowerCase()]=x[1]);
        let expireTime=Infinity;
        if(o['expires']!==undefined)expireTime=Math.min(expireTime,new Date(o['expires']).getTime());
        if(o['max-age']!==undefined)expireTime=Math.min(expireTime,new Date(Date.now()+Number(o['max-age'])*1000).getTime());

        if(o.domain===undefined)o.domain=url.hostname;
        if(o.path===undefined)o.path=url.pathname;

        let cookieKey=JSON.stringify([name,o.domain,o.path]);

        this.cookies.set(cookieKey,{
            value:value,
            properties:o,
            expireTime:expireTime,
        });
        this.clean();
    };
    this.setByRequest=function(res,url){
        res.headers?.['set-cookie']?.forEach(x=>this.set(x,url));
    };
    return this;
}

class RequestAgent{
    constructor(){
        this.cookieManager=new CookieManager();
        this.autoRedirect=true;
    }
    
    async requestOption(method,url,headers,option,body){
        let res=await request(method,url,Object.assign({
            cookie:this.cookieManager.cookieString(url),
        },headers),option,body);
        this.cookieManager.setByRequest(res,url);

        while(this.autoRedirect&&res.headers.location!==undefined){
            const location=res.headers.location;
            switch(res.status){
                case 301:
                case 302:
                {
                    res=await request('GET',location,Object.assign({
                        cookie:this.cookieManager.cookieString(location),
                    },headers),option);
                }
                break;
                case 307:
                case 308:
                {
                    res=await request(method,location,Object.assign({
                        cookie:this.cookieManager.cookieString(location),
                    },headers),option,body);
                }
                break;
                default:
                    return res;
            }
            this.cookieManager.setByRequest(res,location);
        }
        
        return res;
    }

    async request(method,url,headers,body){
        return await this.requestOption(method,url,headers,{},body);
    }

    async requestInsecure(method,url,headers,body){
        return await this.requestOption(method,url,headers,{
            insecureHTTPParser:true
        },body);
    }
}
exports.RequestAgent=RequestAgent;
