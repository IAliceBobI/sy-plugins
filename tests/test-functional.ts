import { zipAnyArrays } from "./functional"
import * as test from "./utils4test"

test.add(false, "three way zip", async () => {
    const array1 = [1, 2, 3];
    const array2 = ['a', 'b', 'c'];
    const array3 = [true, false, true];
    const zipped = zipAnyArrays(array1, array2, array3);
    const expect = [[1, 'a', true], [2, 'b', false], [3, 'c', true]];
    test.assertEqual(zipped, expect)
})


test.run();