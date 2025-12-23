// Frontend county -> towns mapping used by profile forms
const mapping = {
  "Baringo": ["Kabarnet", "Eldama Ravine", "Marigat", "Mogotio", "Tenges"],
  "Bomet": ["Bomet", "Sotik", "Longisa", "Chepalungu", "Sigor"],
  "Bungoma": ["Bungoma", "Webuye", "Kimilili", "Chwele", "Sirisia"],
  "Busia": ["Busia", "Malaba", "Port Victoria", "Nambale", "Butula"],
  "Elgeyo-Marakwet": ["Iten", "Kapsowar", "Chebiemit", "Tambach"],
  "Embu": ["Embu", "Runyenjes", "Siakago", "Kiritiri"],
  "Garissa": ["Garissa", "Modogashe", "Balambala", "Masalani"],
  "Homa Bay": ["Homa Bay", "Mbita", "Kendu Bay", "Oyugis", "Ndhiwa"],
  "Isiolo": ["Isiolo", "Garbatulla", "Kinna", "Merti"],
  "Kajiado": ["Kajiado", "Ngong", "Kitengela", "Ongata Rongai", "Loitokitok"],
  "Kakamega": ["Kakamega", "Mumias", "Lugari", "Butere", "Malava"],
  "Kericho": ["Kericho", "Litein", "Kipkelion", "Londiani", "Soin"],

  "Kiambu": [
  "Thika","Ruiru","Juja","Kiambu Town","Limuru","Kabete","Kikuyu","Githunguri","Lari","Tigoni","Bibirioni","Gitaru","Zambezi",
  "Uthiru","Wangige","Kihara","Ndenderu","Kamiti","Kahawa Sukari","Kahawa Wendani","Kiamumbi","Kiuu","Muthaiga North",
  "Ngegu","Membley","Toll Station","Kencom Ruiru","Tatu City","Mwihoko","Githurai 45","Githurai 44","Ruiru Bypass",
  "Ruiru East","Ruiru West","Kamiti Corner","Ndumberi","Cianda","Kwa Maiko","Ngecha","Ngewa","Gitothua","Kagwe","Ting’ang’a",
  "Kwa Njenga Area (Kiambu Border)","Nderi","Karura","Kibichoi","Kagaa","Tigoni Tea Area","Gikambura",
  "Muguga","Kambe","Kamangu","Zambezi","Kwa Murage"],
  
  "Kilifi": ["Kilifi", "Malindi", "Mariakani", "Kaloleni", "Mtwapa"],
  "Kirinyaga": ["Kerugoya", "Kutus", "Kagio", "Baricho"],
  "Kisii": ["Kisii", "Ogembo", "Nyamache", "Suneka", "Keumbu"],

  "Kisumu": [
  "Kisumu City","Kisumu CBD","Milimani","Tom Mboya Estate","Migosi","Mamboleo","Nyamasaria","Obunga","Manyatta",
  "Nyalenda","Bandani","Kondele","Car Wash","Nyawita","Riat Hills","Lolwe","Airport Area","Dunga Beach",
  "Otonglo","Kibos","Koru","Ahero","Muhoroni","Chemelil","Awasi","Maseno","Kombewa","Kanyawegi","Nyakach",
  "Katito","Sondu","Nyando","Ojola","Kiboswa","Rabuor","Pap Onditi","Chiga","Holo"],

  "Kitui": ["Kitui", "Mwingi", "Mutomo", "Kwa Vonza"],
  "Kwale": ["Kwale", "Ukunda", "Msambweni", "Lunga Lunga"],
  "Laikipia": ["Nanyuki", "Rumuruti", "Nyahururu"],
  "Lamu": ["Lamu", "Mpeketoni", "Faza", "Kiunga"],
  "Machakos": ["Machakos", "Kangundo", "Mwala", "Athi River", "Matuu"],
  "Makueni": ["Wote", "Makindu", "Kibwezi", "Makueni", "Mtito Andei"],
  "Mandera": ["Mandera", "Elwak", "Rhamu", "Lafey"],
  "Marsabit": ["Marsabit", "Moyale", "Laisamis", "North Horr"],
  "Meru": ["Meru", "Maua", "Timau", "Nkubu", "Mitunguu"],
  "Migori": ["Migori", "Awendo", "Kehancha", "Rongo", "Isebania"],

  "Mombasa": [
  "Mombasa Island","Nyali","Bamburi","Kongowea","Kisauni","Mtwapa","Likoni","Ukunda (Kwale Border)","Changamwe",
  "Port Reitz","Magongo","Miritini","Moi International Airport Area","Shanzu","Mkomani","Tudor","Kizingo","Old Town",
  "Ganjoni","Makupa","Tononoka","Buxton","Makande","Mtongwe","Shelly Beach","Kombani","Jomvu","Miritini Bypass","Mwembe Tayari",
  "Mikindani","Kipevu","Junda","Mwandoni","Kadzandani","Frere Town","Nyali Bridge Area","Vescon Estate",
  "Kongowea Market Area","Mamba Village Area"],

  "Murang'a": ["Murang'a", "Kangema", "Maragua", "Kandara", "Kiriaini"],
  "Nairobi": [
  "Westlands", "Kilimani", "Kileleshwa", "Lavington", "Parklands", "Highridge", "Riverside", "Spring Valley", "Gigiri",
  "Runda", "Muthaiga", "Thigiri", "Loresho", "Mountain View", "Kangemi", "Uthiru", "Dagoretti","Kawangware", "Waithaka",
  "Riruta", "Karen", "Langata", "Hardy", "South B", "South C", "Nyayo Estate", "Imara Daima", "Embakasi", "Pipeline", "Tassia",
  "Utawala", "Donholm", "Green Span", "Fedha", "Savannah", "Makadara", "Jericho", "Jerusalem", "Buru Buru", "Maringo", "Hamza",
  "Kaloleni", "Kariokor", "Kamukunji", "Shauri Moyo", "Majengo", "Pumwani", "Eastleigh","Ngara","Ziwani", "Starehe", "Nairobi CBD",
  "Ngummo", "Adams Arcade", "Hurlingham", "Yaya", "Kasarani", "Mwiki", "Clay City", "Garden Estate", "Githurai 44", "Githurai 45",
  "Zimmerman", "Roysambu", "Kahawa West", "Kahawa Sukari", "Kahawa Wendani", "Ruiru Bypass", "Thome", "Mirema", "TRM Drive", "Safari Park",
  "Njiru", "Dandora", "Baba Dogo", "Lucky Summer", "Ruaraka", "Mathare", "Huruma", "Korogocho", "Kariobangi", "Babadogo",
  "Ruai", "Kamulu","Joska", "Mihango", "Kayole", "Komarock","Chokaa","Saika","Embakasi Ranching","Koma Hill","Donholm Phase 8",
  "Wilson Airport Area", "Upper Hill", "Industrial Area", "Landmawe", "Mukuru kwa Njenga", "Mukuru kwa Reuben",
  "Pipeline Estate", "Hazina Estate", "Nyayo Highrise", "Ngong Road", "Racecourse", "Adams Arcade", "Dagoretti Corner", "Kabiria",
  "Satellite", "Kawangware 46", "Lenana", "Karen Plains", "Bomas of Kenya", "Langata Barracks"
],

  "Nakuru": [
  "Nakuru Town", "Nakuru CBD", "Milimani Estate", "Section 58", "Kiamunyi","Shabab","Lanet","Pipeline (Nakuru)",
  "Rhonda","Free Area","Barut","Mwariki","London Estate","Racecourse","Ngata","Kabarak","Menengai","Njoro",
  "Mau Narok","Mau Summit","Molo","Elburgon","Bahati","Subukia","Gilgil","Naivasha","Karagita","Kayole (Naivasha)",
  "Longonot","Mai Mahiu","Kinungi","Kikopey","Salgaa","Kuresoi","Kabazi","Engashura","Kiptangwanyi","Elementaita",
  "Maili Kumi","Shiners","Menengai Crater Area","Lake View","Baruti West"
],
  "Nandi": ["Kapsabet", "Mosoriot", "Kabiyet", "Nandi Hills"],
  "Narok": ["Narok", "Kilgoris", "Ololulung’a", "Suswa"],
  "Nyamira": ["Nyamira", "Keroka", "Ekerenyo", "Borabu"],
  "Nyandarua": ["Ol Kalou", "Engineer", "Njabini", "Nyahururu"],
  "Nyeri": ["Nyeri", "Othaya", "Karatina", "Mukurweini", "Chaka"],
  "Samburu": ["Maralal", "Baragoi", "Wamba", "Archers Post"],
  "Siaya": ["Siaya", "Bondo", "Ugunja", "Usenge", "Yala"],
  "Taita-Taveta": ["Voi", "Taveta", "Wundanyi", "Mwatate"],
  "Tana River": ["Hola", "Garsen", "Bura"],
  "Tharaka-Nithi": ["Chuka", "Marimanti", "Kathwana"],
  "Trans Nzoia": ["Kitale", "Endebess", "Kwanza"],
  "Turkana": ["Lodwar", "Lokichoggio", "Kakuma", "Kalokol"],
  "Uasin Gishu": ["Eldoret", "Burnt Forest", "Turbo", "Moiben"],
  "Vihiga": ["Mbale", "Chavakali", "Luanda", "Hamisi"],
  "Wajir": ["Wajir", "Eldas", "Habaswein", "Bute"],
  "West Pokot": ["Kapenguria", "Chepareria", "Sigor", "Alale"]
}

export const counties = Object.keys(mapping).sort()
export default mapping
