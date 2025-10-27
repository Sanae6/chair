export type Vec2 = { x: number, y: number };

// for flexibility and ease-of-use reasons, this is not a u32
export type Color = string;

export type Transform2D = {
    a: number, c: number, e: number,
    b: number, d: number, f: number
}

export function transformFromTranslation(x: number, y: number): Transform2D {
    return {
        a: 1, c: 0, e: x,
        b: 0, d: 1, f: y
    }
}

export function transformFromScaling(x: number, y: number): Transform2D {
    return {
        a: x, c: 0, e: 0,
        b: 0, d: y, f: 0
    }
}

export function transformFromRotation(rad: number): Transform2D {
    return {
        a: Math.cos(rad), c: -Math.sin(rad), e: 0,
        b: Math.sin(rad), d: Math.cos(rad), f: 0
    }
}

export function composeTransforms(left: Transform2D, right: Transform2D): Transform2D {
    return {
        a: left.a*right.a + left.c*right.b, c: left.a*right.c + left.c*right.d, e: left.a*right.e + left.c*right.f + left.e,
        b: left.b*right.a + left.d*right.b, d: left.b*right.c + left.d*right.d, f: left.b*right.e + left.d*right.f + left.f
    }
}

export function applyTransform(transform: Transform2D, vec: Vec2): Vec2 {
    return {
        x: transform.a*vec.x + transform.c*vec.y + transform.e,
        y: transform.b*vec.x + transform.d*vec.y + transform.f,
    }
}

export function applyInverseTransform(transform: Transform2D, vec: Vec2): Vec2 {
    // From https://stackoverflow.com/a/2625420
    const basisDeterminant = transform.a*transform.d - transform.c*transform.b;
    const basisInverse = {
        a: transform.a*(1/basisDeterminant), c: transform.b*(1/basisDeterminant),
        b: transform.c*(1/basisDeterminant), d: transform.d*(1/basisDeterminant)
    }
    const translatedVec = {
        x: vec.x - transform.e,
        y: vec.y - transform.f,
    }

    return {
        x: basisInverse.a*translatedVec.x + basisInverse.c*translatedVec.y,
        y: basisInverse.b*translatedVec.x + basisInverse.d*translatedVec.y,
    }
}