// 插入排序的 trace：行号指向同目录 code.py。每个 t.step 记录“执行到哪一行 + 此刻的数组与变量”。
import type { MarkName } from '../../engine/types';
import { defineTrace } from '../../genres/algorithm/tracer';

export default defineTrace((t) => {
  const a = [5, 2, 4, 6, 1, 3];
  let sorted = 1; // a[0..sorted) 已经有序
  const view = (marks: Record<string, MarkName> = {}, pointers: Record<string, number> = {}) => {
    const all: Record<string, MarkName> = {};
    for (let k = 0; k < sorted; k++) {
      all[String(k)] = 'done';
    }
    return t.array(a, { marks: { ...all, ...marks }, pointers, bars: true, label: '数组 a（绿色是已排好的前缀）' });
  };

  t.step(1, { viz: { a: view() }, vars: { n: a.length }, note: '输入 6 个数，第一个数自己就算排好了' });
  for (let i = 1; i < a.length; i++) {
    t.step(2, { viz: { a: view({ [i]: 'active' }, { i }) }, vars: { i } });
    const key = a[i];
    t.step(3, { viz: { a: view({ [i]: 'active' }, { i }) }, vars: { i, key }, note: `拿出 a[${i}] = ${key}，给它在左边找位置` });
    let j = i - 1;
    t.step(4, { viz: { a: view({ [j]: 'compare' }, { j }) }, vars: { i, key, j } });
    while (j >= 0 && a[j] > key) {
      t.step(5, { viz: { a: view({ [j]: 'compare' }, { j }) }, vars: { i, key, j }, note: `${a[j]} > ${key}，${a[j]} 往右挪一格` });
      a[j + 1] = a[j];
      t.step(6, { viz: { a: view({ [j + 1]: 'swap' }, { j }) }, vars: { i, key, j } });
      j -= 1;
      t.step(7, { viz: { a: view({}, j >= 0 ? { j } : {}) }, vars: { i, key, j } });
    }
    t.step(5, {
      viz: { a: view(j >= 0 ? { [j]: 'compare' } : {}, j >= 0 ? { j } : {}) },
      vars: { i, key, j },
      note: j >= 0 ? `${a[j]} ≤ ${key}，找到位置了` : '左边已经没有数了',
    });
    a[j + 1] = key;
    sorted = i + 1;
    t.step(8, { viz: { a: view({ [j + 1]: 'found' }) }, vars: { i, key, j }, note: `把 ${key} 放进位置 ${j + 1}` });
  }
  t.step(9, { viz: { a: view() }, vars: { n: a.length }, note: '全部排好' });
});
