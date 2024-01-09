import { expect } from '../../src/prelude';
import { getPermit, trim0x } from '../../src/permit';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { PermitAndCallMock } from '../../typechain-types';

const value = 42n;

describe('Permitable', function () {
    let signer1: SignerWithAddress;
    let signer2: SignerWithAddress;

    before(async function () {
        [signer1, signer2] = await ethers.getSigners();
    });

    async function deployTokens() {
        const PermitAndCallMockFactory = await ethers.getContractFactory('PermitAndCallMock');
        const ERC20PermitMockFactory = await ethers.getContractFactory('ERC20PermitMock');

        const chainId = Number((await ethers.provider.getNetwork()).chainId);
        const permitAndCallMock = <PermitAndCallMock><unknown> await PermitAndCallMockFactory.deploy();
        const erc20PermitMock = await ERC20PermitMockFactory.deploy('USDC', 'USDC', signer1, 100n);
        return { permitAndCallMock, erc20PermitMock, chainId };
    }

    it('should work with valid permit', async function () {
        const { permitAndCallMock, erc20PermitMock, chainId } = await loadFixture(deployTokens);
        const permit = await getPermit(signer1, erc20PermitMock, '1', chainId, await permitAndCallMock.getAddress(), value.toString(), 0x8fffffff.toString(), true);
        const tx = await permitAndCallMock.permitAndCall(erc20PermitMock.target + trim0x(permit), (await permitAndCallMock.foo.populateTransaction()).data);
        expect(tx).to.emit(permitAndCallMock, 'FooCalled');
        expect(await erc20PermitMock.allowance(signer1.address, permitAndCallMock.target)).to.equal(value);
    });

    it('should work with invalid permit', async function () {
        const { permitAndCallMock, erc20PermitMock, chainId } = await loadFixture(deployTokens);
        const badPermit = await getPermit(signer1, erc20PermitMock, '2', chainId, await permitAndCallMock.getAddress(), value.toString(), 0x8fffffff.toString(), true);
        const tx = await permitAndCallMock.permitAndCall(erc20PermitMock.target + trim0x(badPermit), (await permitAndCallMock.foo.populateTransaction()).data);
        expect(tx).to.emit(permitAndCallMock, 'FooCalled');
        expect(await erc20PermitMock.allowance(signer1.address, permitAndCallMock.target)).to.equal(0);
    });
});
