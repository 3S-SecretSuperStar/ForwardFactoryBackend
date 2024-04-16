const getUserRating = (solBalance, ethBalance, tokenBalance, tokenValue, solGas, ethGas, followers) => {
    let sum = 0;
    sum += Number(solBalance) + Number(ethBalance) + Number(ethGas) + Number(followers) + Number(solGas);
    if (Number(tokenBalance)) {
        sum += Number(tokenValue) / Number(tokenBalance)
    }
    return Math.round(
        sum
    )
}

export default getUserRating;