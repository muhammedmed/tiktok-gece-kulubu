// A delayed control response must not roll back the newer SSE player state.
export function isOlderState(incoming,current){
 return Boolean(current&&incoming.epoch===current.epoch&&incoming.mode===current.mode&&incoming.seq<current.seq);
}
