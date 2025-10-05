{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    gowin-eda = {
      url = "github:Sanae6/gowin-eda-flake";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  outputs =
    {
      nixpkgs,
      flake-utils,
      ...
    }@inputs:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
      in
      with pkgs;
      {
        formatter = nixfmt-tree;
        inherit inputs;
        packages.default = pkgs.callPackage ./package.nix { };
        devShells.default = mkShell {
          buildInputs = [
            pnpm
            nodejs
          ];
        };
      }
    );
}
