import {describe,it} from 'node:test';
import {invariantSuite} from './invariants';
describe('Production invariant and reference-pair verification',()=>invariantSuite((name,fn)=>it(name,fn)));
