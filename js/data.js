// Artificial celestial bodies dataset.
// Positions are visual approximations: heliocentric distance is log-scaled so
// that nearby spacecraft and interstellar probes can both be shown in one frame.
// All angles are in degrees. Heliocentric ecliptic-like coordinates: angle is
// measured around the Y axis, tilt is elevation above/below the ecliptic plane.

export const SCALE = 80; // visual units per log10(AU+1)

// helper: convert (au, angleDeg, tiltDeg) -> {x,y,z}
export function pos(au, angle, tilt = 0, jitter = null) {
  const r = Math.log10(Math.max(au, 0) + 1) * SCALE;
  const a = (angle * Math.PI) / 180;
  const t = (tilt * Math.PI) / 180;
  let x = r * Math.cos(t) * Math.cos(a);
  let y = r * Math.sin(t);
  let z = r * Math.cos(t) * Math.sin(a);
  if (jitter) { x += jitter[0]; y += jitter[1]; z += jitter[2]; }
  return { x, y, z };
}

// Reference bodies (Sun + planets) for spatial context
export const REFERENCE_BODIES = [
  { id: "sun",     names: { zh: "太阳",  en: "Sun",     ja: "太陽" },     au: 0,    angle: 0,   color: 0xffd27a, size: 6.0, glow: true },
  { id: "mercury", names: { zh: "水星",  en: "Mercury", ja: "水星" },     au: 0.39, angle: 30,  color: 0xa39282, size: 1.2 },
  { id: "venus",   names: { zh: "金星",  en: "Venus",   ja: "金星" },     au: 0.72, angle: 110, color: 0xe8c98a, size: 1.6 },
  { id: "earth",   names: { zh: "地球",  en: "Earth",   ja: "地球" },     au: 1.00, angle: 200, color: 0x4fc3ff, size: 1.7 },
  { id: "mars",    names: { zh: "火星",  en: "Mars",    ja: "火星" },     au: 1.52, angle: 280, color: 0xff7a59, size: 1.4 },
  { id: "jupiter", names: { zh: "木星",  en: "Jupiter", ja: "木星" },     au: 5.20, angle: 60,  color: 0xe2b07a, size: 3.6 },
  { id: "saturn",  names: { zh: "土星",  en: "Saturn",  ja: "土星" },     au: 9.58, angle: 150, color: 0xe6d3a3, size: 3.0 },
  { id: "uranus",  names: { zh: "天王星", en: "Uranus", ja: "天王星" },   au: 19.2, angle: 230, color: 0xa8e0e6, size: 2.4 },
  { id: "neptune", names: { zh: "海王星", en: "Neptune", ja: "海王星" },  au: 30.1, angle: 320, color: 0x6c9eff, size: 2.4 },
  { id: "pluto",   names: { zh: "冥王星", en: "Pluto",  ja: "冥王星" },   au: 39.5, angle: 0,   color: 0xbfa28a, size: 1.0 },
];

// Spacecraft / artificial bodies
// `au`, `angle`, `tilt` describe a heliocentric placement; `jitter` adds a
// small constant world-space offset so cluster members at the same body
// (e.g. ISS / Hubble / JWST near Earth) don't overlap visually.
export const BODIES = [
  // === Interstellar / deep space (heliocentric > 50 AU) ===
  {
    id: "voyager1", category: "deep", au: 165, angle: 17, tilt: 35,
    names:    { zh: "旅行者1号", en: "Voyager 1", ja: "ボイジャー1号" },
    location: { zh: "星际空间（向蛇夫座方向）", en: "Interstellar space (toward Ophiuchus)", ja: "恒星間空間（へびつかい座方向）" },
    agency: "NASA / JPL",
    launch: "1977-09-05",
    status: "active",
    major: true,
    description: {
      zh: "1977 年发射，目前是离地球最远的人造物，已穿越日球层顶进入星际空间，仍在以约 17 公里/秒的速度向外飞行。携带著名的“金唱片”，记录人类文明的声音与图像。",
      en: "Launched in 1977, the most distant human-made object. It crossed the heliopause into interstellar space and still streams data home at ~17 km/s. Carries the iconic Golden Record of Earth's sounds and images.",
      ja: "1977年打上げ、人類が作った最も遠い物体。太陽圏界面を超え恒星間空間に到達し、現在も約17 km/sで外向きに飛行中。地球の音や画像を収めた「ゴールデンレコード」を搭載。"
    },
    link: "https://en.wikipedia.org/wiki/Voyager_1"
  },
  {
    id: "voyager2", category: "deep", au: 138, angle: 220, tilt: -48,
    names:    { zh: "旅行者2号", en: "Voyager 2", ja: "ボイジャー2号" },
    location: { zh: "星际空间（南天方向）", en: "Interstellar space (southern sky)", ja: "恒星間空間（南天方向）" },
    agency: "NASA / JPL", launch: "1977-08-20", status: "active", major: true,
    description: {
      zh: "唯一近距离飞掠木、土、天王、海王四颗气态行星的探测器，2018 年也进入星际空间。",
      en: "The only spacecraft to fly by all four giant planets — Jupiter, Saturn, Uranus, Neptune. It crossed into interstellar space in 2018.",
      ja: "木星・土星・天王星・海王星の4惑星すべてに接近探査した唯一の探査機。2018年に恒星間空間へ到達。"
    },
    link: "https://en.wikipedia.org/wiki/Voyager_2"
  },
  {
    id: "pioneer10", category: "deep", au: 137, angle: 80, tilt: 3,
    names: { zh: "先驱者10号", en: "Pioneer 10", ja: "パイオニア10号" },
    location: { zh: "向金牛座方向飞行", en: "Coasting toward Taurus", ja: "おうし座方向へ航行中" },
    agency: "NASA", launch: "1972-03-03", status: "inactive",
    description: {
      zh: "首个穿越小行星带并飞掠木星的探测器。2003 年最后一次接收到信号，目前已无源滑行。",
      en: "First spacecraft through the asteroid belt and past Jupiter. Last contact in 2003; now coasting silently outbound.",
      ja: "小惑星帯を越え木星に到達した初の探査機。2003年に通信終了し、現在は無動力で航行中。"
    },
    link: "https://en.wikipedia.org/wiki/Pioneer_10"
  },
  {
    id: "pioneer11", category: "deep", au: 113, angle: 240, tilt: 12,
    names: { zh: "先驱者11号", en: "Pioneer 11", ja: "パイオニア11号" },
    location: { zh: "向天鹰座方向飞行", en: "Coasting toward Aquila", ja: "わし座方向へ航行中" },
    agency: "NASA", launch: "1973-04-06", status: "inactive",
    description: {
      zh: "首次近距离飞掠土星，1995 年通信终止。",
      en: "First close flyby of Saturn. Telemetry ended in 1995.",
      ja: "土星への初接近探査を行った。1995年に通信終了。"
    },
    link: "https://en.wikipedia.org/wiki/Pioneer_11"
  },
  {
    id: "newhorizons", category: "deep", au: 60, angle: 340, tilt: -2,
    names: { zh: "新视野号", en: "New Horizons", ja: "ニューホライズンズ" },
    location: { zh: "柯伊伯带", en: "Kuiper Belt", ja: "カイパーベルト" },
    agency: "NASA / APL", launch: "2006-01-19", status: "active", major: true,
    description: {
      zh: "2015 年完成历史性的冥王星飞掠，并继续飞向更遥远的柯伊伯带天体。",
      en: "Performed the historic Pluto flyby in 2015 and is now exploring distant Kuiper-belt objects.",
      ja: "2015年に冥王星を初の至近距離で観測。現在はさらに遠方のカイパーベルト天体を探査中。"
    },
    link: "https://en.wikipedia.org/wiki/New_Horizons"
  },

  // === Outer solar system ===
  {
    id: "juno", category: "outer", au: 5.20, angle: 60, tilt: 1, jitter: [4, 1, 0],
    names: { zh: "朱诺号", en: "Juno", ja: "ジュノー" },
    location: { zh: "环绕木星", en: "Orbiting Jupiter", ja: "木星周回軌道" },
    agency: "NASA", launch: "2011-08-05", status: "active",
    description: {
      zh: "在极地椭圆轨道环绕木星，研究其内部结构、磁场与极光。",
      en: "Orbits Jupiter on a polar elliptical path, probing its interior, magnetic field and auroras.",
      ja: "木星を極軌道で周回し、内部構造・磁場・オーロラを観測。"
    },
    link: "https://en.wikipedia.org/wiki/Juno_(spacecraft)"
  },
  {
    id: "europaclipper", category: "outer", au: 3.5, angle: 95, tilt: -1,
    names: { zh: "欧罗巴快船", en: "Europa Clipper", ja: "エウロパ・クリッパー" },
    location: { zh: "前往木卫二途中", en: "Cruising to Europa", ja: "エウロパへ航行中" },
    agency: "NASA", launch: "2024-10-14", status: "active",
    description: {
      zh: "前往木卫二的旗舰任务，将多次飞掠这颗冰卫星，搜寻其冰下海洋的宜居线索。",
      en: "Flagship mission to Jupiter's moon Europa, planning dozens of close flybys to assess its subsurface ocean's habitability.",
      ja: "木星の衛星エウロパを目指す旗艦ミッション。氷の下の海の居住可能性を多数のフライバイで調査する。"
    },
    link: "https://en.wikipedia.org/wiki/Europa_Clipper"
  },
  {
    id: "cassini", category: "outer", au: 9.58, angle: 150, tilt: 0, jitter: [3, 0, 2],
    names: { zh: "卡西尼号", en: "Cassini", ja: "カッシーニ" },
    location: { zh: "土星大气（已坠毁）", en: "Saturn's atmosphere (deorbited)", ja: "土星大気（突入終了）" },
    agency: "NASA / ESA / ASI", launch: "1997-10-15", status: "completed",
    description: {
      zh: "在土星系统服务 13 年，2017 年“壮丽终章”坠入土星大气。",
      en: "Spent 13 years exploring Saturn before its 2017 \"Grand Finale\" plunge into the planet's atmosphere.",
      ja: "土星圏で13年活動し、2017年の「グランドフィナーレ」で土星大気へ突入し任務終了。"
    },
    link: "https://en.wikipedia.org/wiki/Cassini%E2%80%93Huygens"
  },
  {
    id: "lucy", category: "outer", au: 4.4, angle: 200, tilt: -3,
    names: { zh: "露西号", en: "Lucy", ja: "ルーシー" },
    location: { zh: "前往木星特洛伊小行星群", en: "En route to Jupiter Trojans", ja: "木星トロヤ群へ航行中" },
    agency: "NASA", launch: "2021-10-16", status: "active",
    description: {
      zh: "首个目标为木星特洛伊小行星群的任务，将巡访多颗原始小行星。",
      en: "First mission to the Jupiter Trojan asteroids, planning to fly past several primitive bodies.",
      ja: "木星トロヤ群を初めて訪問する探査機。複数の原始的小惑星に接近予定。"
    },
    link: "https://en.wikipedia.org/wiki/Lucy_(spacecraft)"
  },
  {
    id: "jupiteric", category: "outer", au: 3.1, angle: 75, tilt: 2,
    names: { zh: "JUICE 木星冰月探测器", en: "JUICE", ja: "JUICE" },
    location: { zh: "前往木星系统", en: "Cruise to the Jovian system", ja: "木星系へ航行中" },
    agency: "ESA", launch: "2023-04-14", status: "active",
    description: {
      zh: "欧空局木星冰卫星探测器，将研究木卫三、木卫四、木卫二三颗冰卫星。",
      en: "ESA's Jupiter Icy Moons Explorer, targeting Ganymede, Callisto, and Europa.",
      ja: "ESAの木星氷衛星探査機。ガニメデ・カリスト・エウロパを観測予定。"
    },
    link: "https://en.wikipedia.org/wiki/Jupiter_Icy_Moons_Explorer"
  },

  // === Mars ===
  {
    id: "perseverance", category: "mars", au: 1.52, angle: 280, tilt: 0, jitter: [0, 0.6, 0],
    names: { zh: "毅力号火星车", en: "Perseverance Rover", ja: "パーサヴィアランス" },
    location: { zh: "火星 · 杰泽罗陨石坑", en: "Mars · Jezero Crater", ja: "火星・ジェゼロクレーター" },
    agency: "NASA", launch: "2020-07-30", status: "active", major: true,
    description: {
      zh: "在杰泽罗古河三角洲采集岩芯样本，搜索古生物迹象，并测试制氧实验 MOXIE。",
      en: "Collecting rock cores in an ancient delta at Jezero, searching for biosignatures and demonstrating oxygen production with MOXIE.",
      ja: "ジェゼロの古代三角州で岩石試料を採取し、古生物の痕跡を探索。MOXIEによる酸素生成実験も実施。"
    },
    link: "https://en.wikipedia.org/wiki/Perseverance_(rover)"
  },
  {
    id: "curiosity", category: "mars", au: 1.52, angle: 280, tilt: 0, jitter: [-1.2, 0.4, 0.6],
    names: { zh: "好奇号火星车", en: "Curiosity Rover", ja: "キュリオシティ" },
    location: { zh: "火星 · 盖尔陨石坑", en: "Mars · Gale Crater", ja: "火星・ゲールクレーター" },
    agency: "NASA", launch: "2011-11-26", status: "active", major: true,
    description: {
      zh: "自 2012 年登陆以来在盖尔陨石坑攀登夏普山，揭示火星早期的宜居环境。",
      en: "Since landing in 2012, has been climbing Mt. Sharp inside Gale Crater, revealing Mars' once habitable past.",
      ja: "2012年着陸以降、ゲールクレーター内のシャープ山を登りながら、火星の太古の居住可能環境を明らかにしている。"
    },
    link: "https://en.wikipedia.org/wiki/Curiosity_(rover)"
  },
  {
    id: "zhurong", category: "mars", au: 1.52, angle: 280, tilt: 0, jitter: [1.2, 0.5, -0.8],
    names: { zh: "祝融号火星车", en: "Zhurong Rover", ja: "祝融" },
    location: { zh: "火星 · 乌托邦平原", en: "Mars · Utopia Planitia", ja: "火星・ユートピア平原" },
    agency: "CNSA", launch: "2020-07-23", status: "inactive", major: true,
    description: {
      zh: "中国首辆火星车，2021 年 5 月成功着陆乌托邦平原，已完成预定任务后进入休眠。",
      en: "China's first Mars rover, landed on Utopia Planitia in May 2021. Entered hibernation after completing its primary mission.",
      ja: "中国初の火星探査車。2021年5月にユートピア平原へ着陸。主任務完了後にスリープ状態へ。"
    },
    link: "https://en.wikipedia.org/wiki/Zhurong_(rover)"
  },
  {
    id: "ingenuity", category: "mars", au: 1.52, angle: 280, tilt: 0, jitter: [0.4, 1.0, 0.2],
    names: { zh: "机智号火星直升机", en: "Ingenuity Helicopter", ja: "インジェニュイティ" },
    location: { zh: "火星 · 杰泽罗陨石坑", en: "Mars · Jezero Crater", ja: "火星・ジェゼロクレーター" },
    agency: "NASA", launch: "2020-07-30", status: "completed",
    description: {
      zh: "首架在地外行星上飞行的航空器。72 次飞行后于 2024 年退役。",
      en: "First aircraft to fly on another planet. Retired in 2024 after 72 flights.",
      ja: "地球外で飛行した初の航空機。72回の飛行を経て2024年に退役。"
    },
    link: "https://en.wikipedia.org/wiki/Ingenuity_(helicopter)"
  },
  {
    id: "tianwen1", category: "mars", au: 1.52, angle: 280, tilt: 0, jitter: [-0.6, 1.4, 0.4],
    names: { zh: "天问一号轨道器", en: "Tianwen-1 Orbiter", ja: "天問1号" },
    location: { zh: "环绕火星", en: "Mars orbit", ja: "火星周回軌道" },
    agency: "CNSA", launch: "2020-07-23", status: "active",
    description: {
      zh: "中国首次自主火星任务，轨道器、着陆器、火星车一次发射全部完成。",
      en: "China's first independent Mars mission — orbiter, lander and rover delivered in a single launch.",
      ja: "中国初の独自火星探査。一度の打上げで周回機・着陸機・探査車を実現。"
    },
    link: "https://en.wikipedia.org/wiki/Tianwen-1"
  },
  {
    id: "mro", category: "mars", au: 1.52, angle: 280, tilt: 0, jitter: [0.0, 1.8, -0.4],
    names: { zh: "火星侦察轨道器", en: "Mars Reconnaissance Orbiter", ja: "マーズ・リコネサンス・オービター" },
    location: { zh: "环绕火星", en: "Mars orbit", ja: "火星周回軌道" },
    agency: "NASA", launch: "2005-08-12", status: "active",
    description: {
      zh: "搭载 HiRISE 高分辨率相机的火星侦察主力,长期为各任务中继通信。",
      en: "Carries the HiRISE camera for ultra-high-resolution Mars imaging and serves as a relay for surface missions.",
      ja: "HiRISEカメラを搭載し、火星の高解像度撮像と地表ミッションの中継を担う。"
    },
    link: "https://en.wikipedia.org/wiki/Mars_Reconnaissance_Orbiter"
  },

  // === Moon ===
  {
    id: "lro", category: "moon", au: 1.0, angle: 200, tilt: 0, jitter: [-1.6, 0.6, 0.0],
    names: { zh: "月球勘测轨道器 LRO", en: "Lunar Reconnaissance Orbiter", ja: "ルナー・リコネサンス・オービター" },
    location: { zh: "环绕月球", en: "Lunar orbit", ja: "月周回軌道" },
    agency: "NASA", launch: "2009-06-18", status: "active",
    description: {
      zh: "为未来月球任务绘制全月高分辨率地图,记录登月遗址。",
      en: "Maps the Moon at high resolution to support future missions and documents historic landing sites.",
      ja: "月面の高精細地図を作成し、過去の着陸地点も観測する月探査機。"
    },
    link: "https://en.wikipedia.org/wiki/Lunar_Reconnaissance_Orbiter"
  },
  {
    id: "yutu2", category: "moon", au: 1.0, angle: 200, tilt: 0, jitter: [-2.0, 0.2, 0.5],
    names: { zh: "玉兔二号月球车", en: "Yutu-2 Rover", ja: "玉兎2号" },
    location: { zh: "月球背面 · 冯·卡门陨石坑", en: "Lunar far side · Von Kármán Crater", ja: "月の裏側・フォン・カルマンクレーター" },
    agency: "CNSA", launch: "2018-12-07", status: "active", major: true,
    description: {
      zh: "随嫦娥四号着陆,人类首次在月背巡视的月球车,持续超期服役。",
      en: "Landed with Chang'e-4 — the first rover to operate on the Moon's far side, still going long beyond its design life.",
      ja: "嫦娥4号と共に着陸し、人類初の月の裏側ローバーとして設計寿命を大きく超えて活動中。"
    },
    link: "https://en.wikipedia.org/wiki/Yutu-2"
  },
  {
    id: "change6", category: "moon", au: 1.0, angle: 200, tilt: 0, jitter: [-2.4, 0.0, 0.0],
    names: { zh: "嫦娥六号", en: "Chang'e 6", ja: "嫦娥6号" },
    location: { zh: "月球背面 · 已采样返回", en: "Far-side sample-return mission complete", ja: "月の裏側・サンプル回収完了" },
    agency: "CNSA", launch: "2024-05-03", status: "completed",
    description: {
      zh: "人类首次月球背面采样返回任务,2024 年带回阿波罗盆地约 1.9 公斤样品。",
      en: "First sample return from the Moon's far side, bringing back ~1.9 kg from the Apollo basin in 2024.",
      ja: "月の裏側からの世界初のサンプルリターン。2024年にアポロ盆地から約1.9 kgを回収。"
    },
    link: "https://en.wikipedia.org/wiki/Chang%27e_6"
  },
  {
    id: "chandrayaan3", category: "moon", au: 1.0, angle: 200, tilt: 0, jitter: [-1.7, -0.4, 0.4],
    names: { zh: "月船三号 / 维克拉姆着陆器", en: "Chandrayaan-3 / Vikram", ja: "チャンドラヤーン3号" },
    location: { zh: "月球南极附近", en: "Near the lunar south pole", ja: "月の南極付近" },
    agency: "ISRO", launch: "2023-07-14", status: "completed",
    description: {
      zh: "印度首次月球软着陆,也是首个在月球南极区域成功着陆的航天器。",
      en: "India's first soft lunar landing and the first ever near the Moon's south pole.",
      ja: "インド初の月面軟着陸であり、月の南極域への史上初の着陸を成功させた。"
    },
    link: "https://en.wikipedia.org/wiki/Chandrayaan-3"
  },
  {
    id: "apollo11", category: "moon", au: 1.0, angle: 200, tilt: 0, jitter: [-1.4, 0.4, -0.5],
    names: { zh: "阿波罗11号 · 静海基地", en: "Apollo 11 · Tranquility Base", ja: "アポロ11号・静かの海基地" },
    location: { zh: "月球 · 静海", en: "Moon · Mare Tranquillitatis", ja: "月・静かの海" },
    agency: "NASA", launch: "1969-07-16", status: "completed", major: true,
    description: {
      zh: "1969 年人类首次踏上月球的地点,留有下降级、月球漫步者足印及科学仪器。",
      en: "Site of humanity's first crewed Moon landing in 1969 — descent stage, footprints and experiments remain.",
      ja: "1969年、人類初の有人月面着陸地点。下降段や足跡、観測機器が今も残る。"
    },
    link: "https://en.wikipedia.org/wiki/Apollo_11"
  },

  // === Earth orbit / Lagrange points ===
  {
    id: "iss", category: "earth", au: 1.0, angle: 200, tilt: 0, jitter: [0, 0, 1.0],
    names: { zh: "国际空间站 ISS", en: "International Space Station", ja: "国際宇宙ステーション" },
    location: { zh: "近地轨道（约 408 km）", en: "Low Earth orbit (~408 km)", ja: "低軌道（約408 km）" },
    agency: "NASA · Roscosmos · ESA · JAXA · CSA", launch: "1998-11-20", status: "active", major: true,
    description: {
      zh: "人类目前在轨最大的空间结构,长期常驻 7 名航天员开展科学研究。",
      en: "The largest crewed structure in orbit, continuously inhabited by international astronauts conducting research.",
      ja: "現在軌道上で最大の有人施設。各国の宇宙飛行士が常駐し科学実験を行っている。"
    },
    link: "https://en.wikipedia.org/wiki/International_Space_Station"
  },
  {
    id: "tiangong", category: "earth", au: 1.0, angle: 200, tilt: 0, jitter: [0.4, -0.2, 0.9],
    names: { zh: "天宫空间站", en: "Tiangong Space Station", ja: "天宮宇宙ステーション" },
    location: { zh: "近地轨道（约 380 km）", en: "Low Earth orbit (~380 km)", ja: "低軌道（約380 km）" },
    agency: "CMSA", launch: "2021-04-29", status: "active", major: true,
    description: {
      zh: "中国常驻三模块空间站,持续轮换神舟飞船航天员,开展空间科学实验。",
      en: "China's three-module crewed station, continuously staffed via Shenzhou crew rotations.",
      ja: "中国の3モジュール有人ステーション。神舟による乗員交代で常時運用されている。"
    },
    link: "https://en.wikipedia.org/wiki/Tiangong_space_station"
  },
  {
    id: "hubble", category: "earth", au: 1.0, angle: 200, tilt: 0, jitter: [-0.3, 0.5, 1.1],
    names: { zh: "哈勃空间望远镜", en: "Hubble Space Telescope", ja: "ハッブル宇宙望遠鏡" },
    location: { zh: "近地轨道（约 540 km）", en: "Low Earth orbit (~540 km)", ja: "低軌道（約540 km）" },
    agency: "NASA / ESA", launch: "1990-04-24", status: "active", major: true,
    description: {
      zh: "服役 30 余年,改写人类对宇宙年龄、星系演化与系外行星的认知。",
      en: "After 30+ years on orbit, has transformed our understanding of cosmic age, galaxies and exoplanets.",
      ja: "30年以上に亘り運用され、宇宙年齢・銀河進化・系外惑星の理解を一変させた。"
    },
    link: "https://en.wikipedia.org/wiki/Hubble_Space_Telescope"
  },
  {
    id: "starlink", category: "earth", au: 1.0, angle: 200, tilt: 0, jitter: [-0.2, -0.7, 0.7],
    names: { zh: "星链卫星星座", en: "Starlink Constellation", ja: "スターリンク衛星群" },
    location: { zh: "近地轨道（约 550 km）", en: "Low Earth orbit (~550 km)", ja: "低軌道（約550 km）" },
    agency: "SpaceX", launch: "2019-05-24", status: "active",
    description: {
      zh: "由数千颗低轨小卫星组成的全球宽带互联网星座,且仍在持续部署。",
      en: "A constellation of thousands of small LEO satellites providing global broadband, still expanding.",
      ja: "数千機の低軌道小型衛星によるグローバルブロードバンド衛星群。現在も拡張中。"
    },
    link: "https://en.wikipedia.org/wiki/Starlink"
  },

  {
    id: "jwst", category: "earth", au: 1.01, angle: 20, tilt: 0, jitter: [0, 1.4, 0],
    names: { zh: "詹姆斯·韦伯空间望远镜", en: "James Webb Space Telescope", ja: "ジェイムズ・ウェッブ宇宙望遠鏡" },
    location: { zh: "日地 L2 拉格朗日点", en: "Sun–Earth L2 Lagrange point", ja: "太陽-地球 L2ラグランジュ点" },
    agency: "NASA / ESA / CSA", launch: "2021-12-25", status: "active", major: true,
    description: {
      zh: "口径 6.5 m 的红外巨眼,在日地 L2 点观测早期宇宙、星系形成与系外行星大气。",
      en: "A 6.5-m infrared observatory at Sun–Earth L2 peering into the early universe, galaxy formation and exoplanet atmospheres.",
      ja: "口径6.5 mの赤外線望遠鏡。太陽-地球 L2 で初期宇宙・銀河形成・系外惑星大気を観測。"
    },
    link: "https://en.wikipedia.org/wiki/James_Webb_Space_Telescope"
  },
  {
    id: "gaia", category: "earth", au: 1.01, angle: 20, tilt: 0, jitter: [0.7, 1.0, 0.4],
    names: { zh: "盖亚天体测量卫星", en: "Gaia", ja: "ガイア" },
    location: { zh: "日地 L2 拉格朗日点", en: "Sun–Earth L2 Lagrange point", ja: "太陽-地球 L2ラグランジュ点" },
    agency: "ESA", launch: "2013-12-19", status: "completed",
    description: {
      zh: "为约 20 亿颗恒星精确测量位置与运动,绘制银河系最完整的三维地图。2025 年退役。",
      en: "Charted nearly two billion stars to build the most detailed 3D map of the Milky Way. Retired in 2025.",
      ja: "約20億個の恒星の位置と運動を精密測定し、天の川銀河の最詳細3D地図を作成。2025年退役。"
    },
    link: "https://en.wikipedia.org/wiki/Gaia_(spacecraft)"
  },
  {
    id: "euclid", category: "earth", au: 1.01, angle: 20, tilt: 0, jitter: [-0.5, 1.6, 0.2],
    names: { zh: "欧几里得空间望远镜", en: "Euclid", ja: "ユークリッド" },
    location: { zh: "日地 L2 拉格朗日点", en: "Sun–Earth L2 Lagrange point", ja: "太陽-地球 L2ラグランジュ点" },
    agency: "ESA", launch: "2023-07-01", status: "active",
    description: {
      zh: "巡天测绘宇宙大尺度结构,研究暗物质与暗能量的分布。",
      en: "Surveys the large-scale structure of the universe to probe dark matter and dark energy.",
      ja: "宇宙の大規模構造をサーベイし、暗黒物質とダークエネルギーの分布を探る。"
    },
    link: "https://en.wikipedia.org/wiki/Euclid_(spacecraft)"
  },
  {
    id: "soho", category: "earth", au: 0.99, angle: 200, tilt: 0, jitter: [0, 0.4, -1.3],
    names: { zh: "SOHO 太阳与日球层观测台", en: "SOHO", ja: "SOHO" },
    location: { zh: "日地 L1 拉格朗日点", en: "Sun–Earth L1 Lagrange point", ja: "太陽-地球 L1ラグランジュ点" },
    agency: "ESA / NASA", launch: "1995-12-02", status: "active",
    description: {
      zh: "在 L1 点持续监测太阳活动,亦发现了数千颗掠日彗星。",
      en: "Continuously monitors the Sun from L1 and has discovered thousands of sun-grazing comets.",
      ja: "L1点から太陽を常時観測し、数千の太陽接近彗星を発見してきた。"
    },
    link: "https://en.wikipedia.org/wiki/Solar_and_Heliospheric_Observatory"
  },
  {
    id: "dscovr", category: "earth", au: 0.99, angle: 200, tilt: 0, jitter: [-0.4, -0.4, -1.2],
    names: { zh: "DSCOVR 深空气候观测台", en: "DSCOVR", ja: "DSCOVR" },
    location: { zh: "日地 L1 拉格朗日点", en: "Sun–Earth L1 Lagrange point", ja: "太陽-地球 L1ラグランジュ点" },
    agency: "NOAA / NASA", launch: "2015-02-11", status: "active",
    description: {
      zh: "兼任太阳风预警与地球全景拍摄,EPIC 相机持续传回“蓝色弹珠”照片。",
      en: "Provides solar-wind warning and full-disk Earth imagery via the EPIC camera.",
      ja: "太陽風監視と地球全景撮影を兼ね、EPICカメラで「青いビー玉」画像を継続取得。"
    },
    link: "https://en.wikipedia.org/wiki/Deep_Space_Climate_Observatory"
  },

  // === Inner solar system ===
  {
    id: "psp", category: "inner", au: 0.07, angle: 350, tilt: 1,
    names: { zh: "帕克太阳探测器", en: "Parker Solar Probe", ja: "パーカー・ソーラー・プローブ" },
    location: { zh: "太阳日冕（最近距离 ~6.9 Gm）", en: "Solar corona (perihelion ~6.9 Gm)", ja: "太陽コロナ近傍（最近接 約6.9 Gm）" },
    agency: "NASA / APL", launch: "2018-08-12", status: "active", major: true,
    description: {
      zh: "人造物离太阳最近的纪录保持者,直接“接触”日冕,研究太阳风起源。",
      en: "Holds the record for the closest approach to the Sun, dipping into the corona to study the solar wind's origin.",
      ja: "人類が最も太陽に接近した探査機。コロナ内部に突入し太陽風の起源を調査。"
    },
    link: "https://en.wikipedia.org/wiki/Parker_Solar_Probe"
  },
  {
    id: "solo", category: "inner", au: 0.55, angle: 80, tilt: 5,
    names: { zh: "太阳轨道飞行器", en: "Solar Orbiter", ja: "ソーラー・オービター" },
    location: { zh: "倾斜日心轨道", en: "Inclined heliocentric orbit", ja: "傾斜した日心軌道" },
    agency: "ESA / NASA", launch: "2020-02-10", status: "active",
    description: {
      zh: "首次拍摄太阳两极的探测器,与帕克探测器协同研究太阳活动。",
      en: "First spacecraft to image the Sun's polar regions, coordinating with Parker Solar Probe.",
      ja: "太陽の極域を初めて撮像した探査機。パーカー・ソーラー・プローブと連携観測。"
    },
    link: "https://en.wikipedia.org/wiki/Solar_Orbiter"
  },
  {
    id: "bepi", category: "inner", au: 0.6, angle: 30, tilt: -2,
    names: { zh: "贝皮可伦坡 BepiColombo", en: "BepiColombo", ja: "ベピ・コロンボ" },
    location: { zh: "前往水星途中", en: "En route to Mercury", ja: "水星へ航行中" },
    agency: "ESA / JAXA", launch: "2018-10-20", status: "active",
    description: {
      zh: "由欧空局与 JAXA 联合研制,将释放两颗轨道器分别研究水星表面与磁层。",
      en: "Joint ESA/JAXA mission carrying two orbiters to study Mercury's surface and magnetosphere.",
      ja: "ESAとJAXAの共同ミッション。2機の周回機で水星の表面と磁気圏を観測する。"
    },
    link: "https://en.wikipedia.org/wiki/BepiColombo"
  },
  {
    id: "akatsuki", category: "inner", au: 0.72, angle: 110, tilt: 0, jitter: [1.0, 0.0, 0.6],
    names: { zh: "晓号金星探测器", en: "Akatsuki", ja: "あかつき" },
    location: { zh: "环绕金星", en: "Venus orbit", ja: "金星周回軌道" },
    agency: "JAXA", launch: "2010-05-20", status: "inactive",
    description: {
      zh: "日本金星气候轨道器,长期研究金星超级旋转大气。",
      en: "Japan's Venus climate orbiter, long-term study of the planet's super-rotating atmosphere.",
      ja: "日本の金星気候探査機。金星のスーパーローテーション大気を長期観測した。"
    },
    link: "https://en.wikipedia.org/wiki/Akatsuki_(spacecraft)"
  },
  {
    id: "osirisapex", category: "inner", au: 1.0, angle: 200, tilt: 0, jitter: [1.5, -1.0, 0.4],
    names: { zh: "OSIRIS-APEX", en: "OSIRIS-APEX", ja: "OSIRIS-APEX" },
    location: { zh: "前往小行星 Apophis", en: "En route to asteroid Apophis", ja: "小惑星アポフィスへ航行中" },
    agency: "NASA", launch: "2016-09-08", status: "active",
    description: {
      zh: "原 OSIRIS-REx,完成贝努小行星采样返回后改名,继续前往 2029 年掠地的 Apophis。",
      en: "Formerly OSIRIS-REx — after returning Bennu samples, redirected to asteroid Apophis for its 2029 Earth flyby.",
      ja: "OSIRIS-REx の後継ミッション。ベヌのサンプル回収後、2029年に地球接近する小惑星アポフィスを目指す。"
    },
    link: "https://en.wikipedia.org/wiki/OSIRIS-APEX"
  },
  {
    id: "dart", category: "inner", au: 1.05, angle: 215, tilt: 0,
    names: { zh: "DART 双小行星撞击试验", en: "DART", ja: "DART（二重小惑星進路変更試験）" },
    location: { zh: "Didymos 系统（已撞击 Dimorphos）", en: "Didymos system (impacted Dimorphos)", ja: "ディディモス系（ディモルフォスへ衝突）" },
    agency: "NASA / APL", launch: "2021-11-24", status: "completed",
    description: {
      zh: "全球首次行星防御撞击试验,2022 年成功改变了小行星 Dimorphos 的轨道。",
      en: "First planetary-defense kinetic impactor; in 2022 it successfully altered the orbit of Dimorphos.",
      ja: "世界初の惑星防衛衝突試験。2022年にディモルフォスの軌道変更に成功。"
    },
    link: "https://en.wikipedia.org/wiki/Double_Asteroid_Redirection_Test"
  },
];
