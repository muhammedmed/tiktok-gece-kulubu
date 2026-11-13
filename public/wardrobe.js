// Adult club guests: ten female and ten male silhouettes, shared across the crowd.
// Identity and outfit remain stable when a guest changes role.
export const guestModels = {
 "female": [
  "female-party-01",
  "female-party-02",
  "female-adult-03",
  "female-adult-11",
  "female-adult-17",
  "female-adult-01",
  "female-adult-08",
  "female-adult-13",
  "female-adult-02",
  "female-adult-15"
 ],
 "male": [
  "male-adult-08",
  "male-adult-11",
  "male-adult-09",
  "male-adult-12",
  "male-adult-04",
  "male-adult-02",
  "male-adult-07",
  "male-adult-10",
  "male-adult-16",
  "male-adult-20"
 ]
};
const staffModels = {
 male: {waiter: 'business-male-06', saz: 'male-adult-08', drum: 'male-adult-11', dj: 'male-adult-12'},
 female: {waiter: 'female-adult-13', saz: 'female-party-02', drum: 'female-adult-08', dj: 'female-party-02'},
};
// Sleeveless rigs avoid painting the geometry of a t-shirt as bare skin.
export const dancerModels=['female-adult-03','female-party-01'];
export const allModels = [...new Set([...Object.values(guestModels).flat(), ...Object.values(staffModels).flatMap(Object.values)])];
export function chooseModel(gender, variant, role) {
 if(role==='dancer')return dancerModels[[0,1,1,0,1][((variant%5)+5)%5]];
 const wardrobe = guestModels[gender] || guestModels.male;
 return staffModels[gender]?.[role] || wardrobe[((variant % wardrobe.length) + wardrobe.length) % wardrobe.length];
}
