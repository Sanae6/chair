{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    gowin-eda = {
      url = "github:Sanae6/gowin-eda-flake";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    fenix = {
      url = "github:nix-community/fenix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  outputs =
    {
      nixpkgs,
      flake-utils,
      fenix,
      ...
    }@inputs:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        overlays = [ fenix.overlays.default ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };
      in
      with pkgs;
      {
        formatter = nixfmt-tree;
        inherit inputs;
        packages.default = pkgs.callPackage ./package.nix { };
        devShells.default = mkShell {
          buildInputs = [
            (pkgs.fenix.combine [
              pkgs.fenix.stable.defaultToolchain
              pkgs.fenix.stable.rust-src
            ])
          ];
        };
      }
    );
}
