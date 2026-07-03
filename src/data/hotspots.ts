import { Hotspot } from '../types';

function h(name: string, lat: number, lng: number, sub: string, freq: 'high' | 'medium' | 'low', season?: string): Hotspot {
  return { name, lat, lng, region: 'hk', subregion: sub, frequency: freq, season };
}

export const HOTSPOTS = {
  victoria_park: h('維多利亞公園', 22.2820, 114.1894, '香港島', 'high'),
  hk_park: h('香港公園', 22.2777, 114.1619, '香港島', 'high'),
  botanical: h('香港動植物公園', 22.2793, 114.1574, '香港島', 'high'),
  kowloon_park: h('九龍公園', 22.3005, 114.1710, '九龍', 'high'),
  sha_tin_park: h('沙田公園', 22.3810, 114.1880, '新界', 'high'),
  tai_po_park: h('大埔海濱公園', 22.4501, 114.1734, '新界', 'medium'),
  maipo: h('米埔自然保護區', 22.4869, 114.0314, '新界', 'high'),
  longvalley: h('塱原濕地', 22.5017, 114.1103, '新界', 'high'),
  wetland: h('香港濕地公園', 22.4666, 114.0072, '新界', 'high'),
  lukkeng: h('大埔滘', 22.4242, 114.1759, '新界', 'high'),
  shingmun: h('城門水塘', 22.3902, 114.1378, '新界', 'high'),
  taipo_kau: h('大埔滘自然護理區', 22.4242, 114.1759, '新界', 'medium'),
  taimoshan: h('大帽山', 22.4106, 114.1244, '新界', 'medium'),
  kadoorie: h('嘉道理農場', 22.4334, 114.1189, '新界', 'high'),
  namsangwai: h('南生圍', 22.4586, 114.0422, '新界', 'high'),
  lamma: h('南丫島', 22.2056, 114.1187, '離島', 'medium'),
  cheungchau: h('長洲', 22.2105, 114.0285, '離島', 'medium'),
  lantau: h('大嶼山東涌灣', 22.2844, 113.9414, '離島', 'medium'),
  victoria_harbour: h('維多利亞港', 22.2930, 114.1694, '香港島', 'high'),
  aberdeen: h('鴨脷洲', 22.2410, 114.1547, '香港島', 'high'),
  yuen_long_park: h('元朗公園', 22.4445, 114.0226, '新界', 'medium'),
  sai_kung: h('西貢碼頭', 22.3808, 114.2734, '新界', 'medium'),
  pak_nai: h('白泥', 22.4369, 113.9517, '新界', 'low'),
  tuen_mun_park: h('屯門公園', 22.3915, 113.9730, '新界', 'medium'),
  tsing_yi: h('青衣公園', 22.3543, 114.1070, '新界', 'medium'),
  tsuen_wan: h('荃灣公園', 22.3705, 114.1162, '新界', 'medium'),
  wong_uk_hang: h('黃竹坑', 22.2500, 114.1600, '香港島', 'medium'),
};
