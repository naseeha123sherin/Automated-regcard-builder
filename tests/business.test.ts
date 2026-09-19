import {describe,it} from 'vitest';
import {invariantSuite} from './invariants';
describe('Production invariant and reference-pair verification',()=>invariantSuite((name,fn)=>it(name,fn)));
