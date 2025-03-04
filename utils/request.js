const {URL}=require('url');
const http=require('http');
const https=require('https');
const zlib=require('zlib');

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

