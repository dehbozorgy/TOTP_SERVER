const express = require('express');
const app = express();
const port = 80;

const OTPAuth = require('otpauth');
const base32 = require('hi-base32');
const QRCode = require('qrcode');
const {TOTP} = require("otpauth");

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.get('/',(req,res)=>{
   res.send('Two Factor Authentication Example ... ');
});

const users = [];

const _duration = 120.0;

app.post('/register',(req,res)=>{

    const {username,password} = req.body;

    const user = users.find((u)=>u.username==username);

    if (!user){

        const id = users.length + 1;

        users.push({id,username,password});

        console.log(users.at(-1));

        res.status(200).json({
            'data':users.at(-1),
            'success':true
        });
    }
    else {
        res.status(200).json({
            'data':user,
            'success':true
        });
    }



});

app.post('/enable-2fa',(req,res)=>{

    const {username,label} = req.body;

    const user = users.find((u)=>u.username==username);

    if (!user){
        return res.status(404).send('User not found');
    }

    // var v1 = `{username:${username},password:${user.password},now:${Date.now()}}`;

    var v1 = `{username:${username},password:${user.password}}`;

    // Encrypt
    var secret = base32.encode(v1);

    user.secret = secret;

    let totp = new OTPAuth.TOTP({
        issuer : label,
        label:label,
        algorithm:'SHA1',
        secret:user.secret,
        period:_duration,
        digits:6
    });

    let otpauth_url = totp.toString();

    let token = totp.generate();

    let second = totp.period - (Math.floor(Date.now() / 1000) % totp.period);

    QRCode.toDataURL(otpauth_url, function (err, url) {

        if (err){
            return res.status(500).json({
                'data':'Error While generate Qr Code ...',
                'success':false
            })
        }
        else {
            res.json({
                'data':{
                    'url':url,
                    'label':label,
                    'token': token,
                    'second': second,
                },
                'success':true
            })
        }

    })

});

app.post('/verify-2fa',async (req,res)=>{

    const {username,token} = req.body;

    const user = users.find((u)=>u.username==username);

    if (!user){
        return res.status(404).send('User not found');
    }

    let totp = new OTPAuth.TOTP({
        algorithm:'SHA1',
        secret:user.secret,
        period:_duration,
        digits:6
    });

    let second = totp.period - (Math.floor(Date.now() / 1000) % totp.period);

    let delta = totp.validate({token,window:1});

    res.json({
        'token': token,
        'second': second,
        'delta':delta,
        'success':true
    });

    // if (delta===null) {
    //     res.json({
    //         'data': 'Already Used Token ... ',
    //         'success':true
    //     });
    // }
    // else if(delta===0){
    //
    //     res.json({
    //         'token': token,
    //         'second': second,
    //         'delta':delta,
    //         'success':true
    //     });
    //
    //     const {username,password} = user;
    //
    //     var v1 = `{username:${username},password:${user.password},now:${Date.now()}}`;
    //
    //     // Encrypt
    //     var secret = base32.encode(v1);
    //
    //     user.secret = secret;
    //
    // }
    // else if(delta===-1){
    //     res.json({
    //         'data': 'Time Out Token ... ',
    //         'success':true
    //     });
    // }

});

app.listen(port,()=>{
    console.log(`server started at port = ${port}`);
});