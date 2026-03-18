"use client";
import CardBox from "../shared/CardBox";
import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import BreadcrumbComp from "@/app/(DashboardLayout)/layout/shared/breadcrumb/BreadcrumbComp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getInitials(firstName: string, lastName: string): string {
    const first = (firstName || "").trim().charAt(0).toUpperCase();
    const last = (lastName || "").trim().charAt(0).toUpperCase();
    return first && last ? `${first}${last}` : (first || last || "?");
}

const UserProfile = () => {
    const [openModal, setOpenModal] = useState(false);
    const [modalType, setModalType] = useState<"personal" | "address" | null>(null);

    const BCrumb = [
        { to: "/", title: "Accueil" },
        { title: "Profil utilisateur" },
    ];

    const [personal, setPersonal] = useState({
        firstName: "Mathew",
        lastName: "Anderson",
        email: "mathew.anderson@gmail.com",
        phone: "(347) 528-1947",
        position: "Team Leader",
        facebook: "#!",
        twitter: "#!",
        github: "#!",
        dribbble: "#!"
    });

    const [address, setAddress] = useState({
        location: "United States",
        state: "San Diego, California, United States",
        pin: "92101",
        zip: "30303",
        taxNo: "GA45273910"
    });

    const [tempPersonal, setTempPersonal] = useState(personal);
    const [tempAddress, setTempAddress] = useState(address);

    useEffect(() => {
        if (openModal && modalType === "personal") {
            setTempPersonal(personal);
        }
        if (openModal && modalType === "address") {
            setTempAddress(address);
        }
    }, [openModal, modalType, personal, address]);

    const handleSave = () => {
        if (modalType === "personal") {
            setPersonal(tempPersonal);
        } else if (modalType === "address") {
            setAddress(tempAddress);
        }
        setOpenModal(false);
    };

    const socialLinks = [
        { href: "#!", icon: "streamline-logos:facebook-logo-2-solid" },
        { href: "#!", icon: "streamline-logos:x-twitter-logo-solid" },
        { href: "#!", icon: "ion:logo-github" },
        { href: "#!", icon: "streamline-flex:dribble-logo-remix" },
    ];

    return (
        <>
            <BreadcrumbComp title="Profil utilisateur" items={BCrumb} />
            <div className="flex flex-col gap-6">
                <CardBox className="p-6 bg-background overflow-hidden border border-border rounded-xl shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center gap-6 rounded-xl relative w-full">
                        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-2xl font-semibold">
                            {getInitials(personal.firstName, personal.lastName)}
                        </span>
                        <div className="flex flex-wrap gap-4 justify-center sm:justify-between items-center w-full">
                            <div className="flex flex-col sm:text-left text-center gap-1.5">
                                <h2 className="text-xl font-semibold text-foreground">{personal.firstName} {personal.lastName}</h2>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1 md:gap-3 text-sm text-muted-foreground">
                                    <span>{personal.position}</span>
                                    <span className="hidden xl:inline h-4 w-px bg-border shrink-0" aria-hidden />
                                    <span>{address.location}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {socialLinks.map((item, index) => (
                                    <Link key={index} href={item.href} target="_blank" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background hover:bg-muted hover:text-foreground transition-colors">
                                        <Icon icon={item.icon} width="18" height="18" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardBox>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <CardBox className="p-6 bg-background border border-border rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Icon icon="solar:user-id-outline" width="18" height="18" />
                            </span>
                            <h3 className="text-lg font-semibold text-foreground">Informations personnelles</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Prénom</p>
                                <p className="text-sm text-foreground">{personal.firstName}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Nom</p>
                                <p className="text-sm text-foreground">{personal.lastName}</p>
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                                <p className="text-xs font-medium text-muted-foreground">Email</p>
                                <p className="text-sm text-foreground">{personal.email}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Téléphone</p>
                                <p className="text-sm text-foreground">{personal.phone}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Poste</p>
                                <p className="text-sm text-foreground">{personal.position}</p>
                            </div>
                        </div>
                        <div className="flex justify-end mt-5">
                            <Button onClick={() => { setModalType("personal"); setOpenModal(true); }} className="flex items-center gap-2 rounded-md">
                                <Icon icon="ic:outline-edit" width="18" height="18" /> Modifier
                            </Button>
                        </div>
                    </CardBox>

                    <CardBox className="p-6 bg-background border border-border rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Icon icon="solar:map-point-outline" width="18" height="18" />
                            </span>
                            <h3 className="text-lg font-semibold text-foreground">Adresse</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Pays / Ville</p>
                                <p className="text-sm text-foreground">{address.location}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Région / État</p>
                                <p className="text-sm text-foreground">{address.state}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Code PIN</p>
                                <p className="text-sm text-foreground">{address.pin}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Code postal</p>
                                <p className="text-sm text-foreground">{address.zip}</p>
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                                <p className="text-xs font-medium text-muted-foreground">N° fiscal</p>
                                <p className="text-sm text-foreground">{address.taxNo}</p>
                            </div>
                        </div>
                        <div className="flex justify-end mt-5">
                            <Button onClick={() => { setModalType("address"); setOpenModal(true); }} className="flex items-center gap-2 rounded-md">
                                <Icon icon="ic:outline-edit" width="18" height="18" /> Modifier
                            </Button>
                        </div>
                    </CardBox>
                </div>
            </div>

            <Dialog open={openModal} onOpenChange={setOpenModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            {modalType === "personal" ? (
                                <>
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <Icon icon="solar:user-id-outline" width="18" height="18" />
                                    </span>
                                    Modifier les informations personnelles
                                </>
                            ) : (
                                <>
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <Icon icon="solar:map-point-outline" width="18" height="18" />
                                    </span>
                                    Modifier l&apos;adresse
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {modalType === "personal" ? (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="firstName" className="text-muted-foreground">Prénom</Label>
                                <Input
                                    id="firstName"
                                    placeholder="Prénom"
                                    value={tempPersonal.firstName}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, firstName: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="lastName" className="text-muted-foreground">Nom</Label>
                                <Input
                                    id="lastName"
                                    placeholder="Nom"
                                    value={tempPersonal.lastName}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, lastName: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Email"
                                    value={tempPersonal.email}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, email: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="phone" className="text-muted-foreground">Téléphone</Label>
                                <Input
                                    id="phone"
                                    placeholder="Téléphone"
                                    value={tempPersonal.phone}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, phone: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="position" className="text-muted-foreground">Poste</Label>
                                <Input
                                    id="position"
                                    placeholder="Poste"
                                    value={tempPersonal.position}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, position: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="facebook" className="text-muted-foreground">Facebook</Label>
                                <Input
                                    id="facebook"
                                    placeholder="URL Facebook"
                                    value={tempPersonal.facebook}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, facebook: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="twitter" className="text-muted-foreground">Twitter / X</Label>
                                <Input
                                    id="twitter"
                                    placeholder="URL Twitter"
                                    value={tempPersonal.twitter}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, twitter: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="github" className="text-muted-foreground">GitHub</Label>
                                <Input
                                    id="github"
                                    placeholder="URL GitHub"
                                    value={tempPersonal.github}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, github: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2 lg:col-span-2">
                                <Label htmlFor="dribbble" className="text-muted-foreground">Dribbble</Label>
                                <Input
                                    id="dribbble"
                                    placeholder="URL Dribbble"
                                    value={tempPersonal.dribbble}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, dribbble: e.target.value })}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="location" className="text-muted-foreground">Pays / Ville</Label>
                                <Input
                                    id="location"
                                    placeholder="Pays / Ville"
                                    value={tempAddress.location}
                                    onChange={(e) => setTempAddress({ ...tempAddress, location: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="state" className="text-muted-foreground">Région / État</Label>
                                <Input
                                    id="state"
                                    placeholder="Région / État"
                                    value={tempAddress.state}
                                    onChange={(e) => setTempAddress({ ...tempAddress, state: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="pin" className="text-muted-foreground">Code PIN</Label>
                                <Input
                                    id="pin"
                                    placeholder="Code PIN"
                                    value={tempAddress.pin}
                                    onChange={(e) => setTempAddress({ ...tempAddress, pin: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="zip" className="text-muted-foreground">Code postal</Label>
                                <Input
                                    id="zip"
                                    placeholder="Code postal"
                                    value={tempAddress.zip}
                                    onChange={(e) => setTempAddress({ ...tempAddress, zip: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2 lg:col-span-2">
                                <Label htmlFor="taxNo" className="text-muted-foreground">N° fiscal</Label>
                                <Input
                                    id="taxNo"
                                    placeholder="N° fiscal"
                                    value={tempAddress.taxNo}
                                    onChange={(e) => setTempAddress({ ...tempAddress, taxNo: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2 mt-6 border-t pt-4">
                        <Button variant="outline" className="rounded-md gap-2" onClick={() => setOpenModal(false)}>
                            <Icon icon="solar:close-circle-outline" width="18" height="18" /> Fermer
                        </Button>
                        <Button className="rounded-md gap-2" onClick={handleSave}>
                            <Icon icon="solar:check-circle-outline" width="18" height="18" /> Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default UserProfile;
