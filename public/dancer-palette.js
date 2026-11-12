export const DANCER_COLORS=['#7d203b','#ad283f','#562875','#186274','#235b4c'];
// Five stage looks share the existing rigs/textures; no new character downloads.
export const DANCER_LOOKS=[
 {hair:'#302019',skin:'#d3a184',lip:'#a91e48',eye:'#674857',blush:'#c87574',makeup:1.18},
 {hair:'#b8783d',skin:'#e3ad90',lip:'#b23742',eye:'#775437',blush:'#d37d70',makeup:1.16},
 {hair:'#c4a363',skin:'#e9b99e',lip:'#b22b58',eye:'#756077',blush:'#d87c8c',makeup:1.20},
 {hair:'#713b28',skin:'#c89171',lip:'#a62935',eye:'#66503e',blush:'#bd6f64',makeup:1.18},
 {hair:'#ccb580',skin:'#e8bba3',lip:'#b13b64',eye:'#65506e',blush:'#d68b93',makeup:1.18},
];
export function dancerLook(variant=0){return DANCER_LOOKS[((variant%5)+5)%5];}
