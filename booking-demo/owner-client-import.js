/* CSV stays in memory until the verified owner submits it. No file contents enter diagnostics. */
(() => {
 'use strict';
 function parse(text){
  if(typeof text!=='string'||text.length>250000)throw Error('Choose a CSV smaller than 250 KB.');
  text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,closed=false;
  for(let i=0;i<=text.length;i++){
   const c=text[i];
   if(quoted){if(c===undefined)throw Error('A quoted field is not closed. Check your CSV.');if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
   if(c==='"'&&!cell&&!closed){quoted=true;continue;}
   if(c===','||c==='\r'||c==='\n'||c===undefined){row.push(cell.trim());cell='';closed=false;if(c!==','){if(row.some(Boolean))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}continue;}
   if(closed&&c.trim())throw Error('Check the commas and quotation marks in your CSV.');cell+=c;
  }
  const headers=rows.shift()?.map(x=>x.toLowerCase());
  if(!headers||headers.length!==3||new Set(headers).size!==3||!['name','email','phone'].every(key=>headers.includes(key)))throw Error('Use the template headers: name, email, phone.');
  if(!rows.length||rows.length>500)throw Error('Include between 1 and 500 clients.');
  return rows.map((cells,index)=>{if(cells.length!==3)throw Error('Check the three columns on row '+(index+2)+'.');const item=Object.fromEntries(headers.map((key,i)=>[key,cells[i]]));
   if(!item.name||item.name.length>80||item.email.length>254||item.phone.length>40||(!item.email&&!item.phone)||item.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)||item.phone&&!/^\+?[0-9 ()-]{7,40}$/.test(item.phone)||Object.values(item).some(x=>/[\x00-\x1f\x7f]/.test(x)))throw Error('Check the name and contact details on row '+(index+2)+'.');return item;
  });
 }
 window.JovaClientImport={parse};
})();
