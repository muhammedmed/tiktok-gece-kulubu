import test from 'node:test';
import assert from 'node:assert/strict';
import {avatarUrl, userAvatar, eventDecoder} from '../src/live.js';
import {ClubSession} from '../src/session.js';
import {DEFAULT_SETTINGS} from '../public/club-contract.js';

// Euler-WebSocket-SDK schemas/v2 -> tiktok-live-proto-full-types/v2:
// User.profilePicture{Medium,Large}: Image; Image.url: string[].
const photo = 'https://p16-sign.example.com/avatar.jpeg?x-expires=1800000000&x-signature=a%2Bb%2Fc%3D';
const viewer = {userId:'7190000000000000001', uniqueId:'viewer', nickname:'İpek',
 profilePicture:{url:[photo],width:100,height:100}};

test('Euler v2 chat, like and gift packets retain the full signed portrait URL', () => {
 const decode = eventDecoder();
 for (const type of ['WebcastChatMessage','WebcastLikeMessage','WebcastGiftMessage']) {
  const e = decode({type,data:{user:viewer,comment:'kadın',likeCount:2,giftId:5655}});
  assert.equal(e.avatar,photo);assert.equal(e.id,viewer.userId);assert.equal(e.name,'İpek');
 }
});

test('portrait accepts current and legacy image shapes, falling back past empty or invalid fields', () => {
 for (const user of [
  {profilePictureMedium:{url:[photo]}}, {profilePictureLarge:{url:[photo]}},
  {avatarThumb:{urlList:[photo]}}, {avatar_medium:{url_list:[photo]}},
  {avatarLarge:[photo]}, {profilePictureUrl:photo}, {profilePicture:photo},
  {profilePicture:{url:photo}}, {avatarJpg:{url:[photo]}},
  {profilePicture:{url:[],urlList:[photo]}},
  {profilePicture:{url:['http://example.com/not-secure',null]},profilePictureMedium:{url:[photo]}}
 ]) assert.equal(userAvatar(user),photo);
 for (const value of [null,{},'',42,'javascript:alert(1)','data:image/png;base64,xxx',
  'http://example.com/p.png','https://user:password@example.com/p.png','https://example.com/'+ 'x'.repeat(4096)]) {
  assert.equal(avatarUrl(value),'');assert.equal(userAvatar({profilePicture:{url:[value]}}),'');
 }
 assert.equal(userAvatar(null),'');
});

test('v2 photo reaches floor, queued gift presentation and updated chat without a role reset', () => {
 const s = new ClubSession(DEFAULT_SETTINGS), decode = eventDecoder();
 s.accept(decode({type:'WebcastChatMessage',data:{user:viewer,comment:'kadın'}}));
 s.accept(decode({type:'WebcastGiftMessage',data:{user:{userId:viewer.userId,nickname:'İpek'},giftId:5655}}));
 const p = s.players.get(viewer.userId), revision = p.revision;
 assert.equal(p.avatar,photo);assert.equal(s.events.at(-1).player.avatar,photo);
 const next = 'https://example.com/updated.jpg';
 s.accept(decode({type:'WebcastChatMessage',data:{user:{...viewer,profilePicture:{url:[next]}},comment:'Merhaba'}}));
 assert.equal(p.avatar,next);assert.equal(p.chat.text,'Merhaba');assert.equal(p.revision,revision);
 s.accept(decode({type:'WebcastLikeMessage',data:{user:{userId:viewer.userId},likeCount:1}}));
 assert.equal(s.snapshot().players[0].avatar,next);
});
