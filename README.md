<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formulaire de Demande d'Emploi</title>
    <style>
        /* Base Styles */
        :root {
            --primary-blue: #1e3a5f;
            --text-dark: #333;
            --bg-light: #f4f4f4;
            --border-color: #ccc;
        }

        * {
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        body {
            background-color: var(--bg-light);
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
        }

        .form-container {
            background-color: white;
            width: 100%;
            max-width: 900px;
            padding: 30px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        /* Header */
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid var(--primary-blue);
            padding-bottom: 15px;
            margin-bottom: 20px;
        }

        .logo-area h1 {
            color: var(--primary-blue);
            margin: 0;
            font-size: 24px;
        }
        
        .logo-area h1 span {
            color: #d32f2f;
        }

        .logo-area p {
            margin: 5px 0 0 0;
            font-size: 12px;
            color: var(--text-dark);
        }

        .form-title {
            background-color: var(--primary-blue);
            color: white;
            padding: 10px 20px;
            text-align: center;
            font-weight: bold;
            font-size: 18px;
            border-radius: 4px;
        }

        /* Grid Layout */
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        /* Sections */
        .section {
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 20px;
        }

        .section-title {
            background-color: var(--primary-blue);
            color: white;
            padding: 5px 10px;
            font-size: 14px;
            font-weight: bold;
            margin: -15px -15px 15px -15px;
            border-top-left-radius: 4px;
            border-top-right-radius: 4px;
        }

        /* Form Fields */
        .field {
            display: flex;
            flex-direction: column;
            margin-bottom: 10px;
        }

        .field label {
            font-size: 12px;
            color: #666;
            margin-bottom: 2px;
        }

        .field input[type="text"],
        .field input[type="date"],
        .field input[type="email"],
        .field input[type="tel"],
        .field select {
            border: none;
            border-bottom: 1px solid #000;
            padding: 4px;
            font-size: 14px;
            background: transparent;
            outline: none;
        }

        .field input:focus, .field select:focus {
            border-bottom: 2px solid var(--primary-blue);
        }

        /* Checkbox Groups */
        .checkbox-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            font-size: 13px;
            margin-top: 5px;
        }

        .checkbox-group label {
            display: flex;
            align-items: center;
            cursor: pointer;
        }

        .checkbox-group input {
            margin-right: 8px;
        }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-top: 5px;
        }

        table th, table td {
            border: 1px solid var(--border-color);
            padding: 8px;
            text-align: left;
        }

        table th {
            background-color: #e9ecef;
            font-weight: bold;
            font-size: 12px;
        }

        table input {
            width: 100%;
            border: none;
            outline: none;
            background: transparent;
            font-size: 13px;
        }

        /* Declaration */
        .declaration {
            font-size: 12px;
            line-height: 1.4;
            margin-bottom: 15px;
        }

        .signature-area {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .submit-btn {
            background-color: var(--primary-blue);
            color: white;
            border: none;
            padding: 12px 25px;
            font-size: 16px;
            cursor: pointer;
            border-radius: 4px;
            width: 100%;
            margin-top: 20px;
        }

        .submit-btn:hover {
            background-color: #152a46;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .form-grid {
                grid-template-columns: 1fr;
            }
            header {
                flex-direction: column;
                text-align: center;
                gap: 15px;
            }
        }
    </style>
</head>
<body>

<div class="form-container">
    <header>
        <div class="logo-area">
            <h1>GUICHET <span>EMPLOI</span></h1>
            <p>CANADA INTERNATIONAL - Votre passerelle vers l'emploi au Canada</p>
        </div>
        <div class="form-title">
            FORMULAIRE DE DEMANDE D'EMPLOI
        </div>
    </header>

    <form action="#" method="POST">
        <div class="form-grid">
            
            <!-- Left Column -->
            <div>
                <!-- 1. Informations Personnelles -->
                <div class="section">
                    <div class="section-title">1. INFORMATIONS PERSONNELLES</div>
                    
                    <div class="field">
                        <label>Nom</label>
                        <input type="text" name="nom" required>
                    </div>
                    <div class="field">
                        <label>Prénom(s)</label>
                        <input type="text" name="prenom" required>
                    </div>
                    <div class="field">
                        <label>Date de naissance</label>
                        <input type="date" name="date_naissance">
                    </div>
                    <div class="field">
                        <label>Sexe</label>
                        <div style="margin-top: 5px;">
                            <label><input type="radio" name="sexe" value="homme"> Homme</label>
                            <label style="margin-left: 15px;"><input type="radio" name="sexe" value="femme"> Femme</label>
                        </div>
                    </div>
                    <div class="field">
                        <label>Nationalité</label>
                        <input type="text" name="nationalite">
                    </div>
                    <div class="field">
                        <label>Numéro de passeport ou CNI</label>
                        <input type="text" name="passeport">
                    </div>
                    <div class="field">
                        <label>Situation matrimoniale</label>
                        <select name="situation">
                            <option value=""></option>
                            <option value="celibataire">Célibataire</option>
                            <option value="marie">Marié(e)</option>
                            <option value="divorce">Divorcé(e)</option>
                            <option value="veuf">Veuf(ve)</option>
                        </select>
                    </div>
                    <div class="field">
                        <label>Adresse complète</label>
                        <input type="text" name="adresse">
                    </div>
                    <div class="field">
                        <label>Ville</label>
                        <input type="text" name="ville">
                    </div>
                    <div class="field">
                        <label>Province / État</label>
                        <input type="text" name="province">
                    </div>
                    <div class="field">
                        <label>Pays</label>
                        <input type="text" name="pays">
                    </div>
                    <div class="field">
                        <label>Code postal / ZIP</label>
                        <input type="text" name="code_postal">
                    </div>
                    <div class="field">
                        <label>Téléphone</label>
                        <input type="tel" name="telephone">
                    </div>
                    <div class="field">
                        <label>Téléphone (autre)</label>
                        <input type="tel" name="telephone_2">
                    </div>
                    <div class="field">
                        <label>WhatsApp</label>
                        <input type="tel" name="whatsapp">
                    </div>
                    <div class="field">
                        <label>E-mail</label>
                        <input type="email" name="email" required>
                    </div>
                </div>

                <!-- 4. Expérience Professionnelle -->
                <div class="section">
                    <div class="section-title">4. EXPÉRIENCE PROFESSIONNELLE</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Entreprise</th>
                                <th>Poste occupé</th>
                                <th>Durée</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td><input type="text" name="exp_1_entreprise"></td><td><input type="text" name="exp_1_poste"></td><td><input type="text" name="exp_1_duree"></td></tr>
                            <tr><td><input type="text" name="exp_2_entreprise"></td><td><input type="text" name="exp_2_poste"></td><td><input type="text" name="exp_2_duree"></td></tr>
                            <tr><td><input type="text" name="exp_3_entreprise"></td><td><input type="text" name="exp_3_poste"></td><td><input type="text" name="exp_3_duree"></td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- 6. Langues -->
                <div class="section">
                    <div class="section-title">6. LANGUES</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Langue</th>
                                <th>Niveau</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><input type="text" value="Français" readonly style="font-weight:bold;"></td>
                                <td>
                                    <label><input type="checkbox" name="francais_debutant"> Débutant</label>
                                    <label><input type="checkbox" name="francais_moyen"> Moyen</label>
                                    <label><input type="checkbox" name="francais_bon"> Bon</label>
                                </td>
                            </tr>
                            <tr>
                                <td><input type="text" value="Anglais" readonly style="font-weight:bold;"></td>
                                <td>
                                    <label><input type="checkbox" name="anglais_debutant"> Débutant</label>
                                    <label><input type="checkbox" name="anglais_moyen"> Moyen</label>
                                    <label><input type="checkbox" name="anglais_bon"> Bon</label>
                                </td>
                            </tr>
                            <tr>
                                <td><input type="text" placeholder="Autre:"></td>
                                <td>
                                    <label><input type="checkbox" name="autre_debutant"> Débutant</label>
                                    <label><input type="checkbox" name="autre_moyen"> Moyen</label>
                                    <label><input type="checkbox" name="autre_bon"> Bon</label>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- 8. Documents Fournis -->
                <div class="section">
                    <div class="section-title">8. DOCUMENTS FOURNIS</div>
                    <div class="checkbox-group">
                        <label><input type="checkbox" name="doc_cv"> CV</label>
                        <label><input type="checkbox" name="doc_photo"> Photo d'identité</label>
                        <label><input type="checkbox" name="doc_passeport"> Passeport</label>
                        <label><input type="checkbox" name="doc_lettre"> Lettre de motivation</label>
                        <label><input type="checkbox" name="doc_diplome"> Diplôme(s)</label>
                        <label><input type="checkbox" name="doc_autre"> Autres: <input type="text" style="border-bottom:1px solid #000; width: 80px;"></label>
                        <label><input type="checkbox" name="doc_certificat"> Certificat(s)</label>
                    </div>
                </div>
            </div>

            <!-- Right Column -->
            <div>
                <!-- Date -->
                <div style="text-align: right; margin-bottom: 15px;">
                    <label style="font-size: 14px;">Date : </label>
                    <input type="date" style="border:none; border-bottom:1px solid #000; font-size: 14px;">
                </div>

                <!-- 2. Poste Recherché -->
                <div class="section">
                    <div class="section-title">2. POSTE RECHERCHÉ</div>
                    <div class="field">
                        <label>Poste souhaité</label>
                        <input type="text" name="poste_souhaite">
                    </div>
                    <div class="field">
                        <label>Domaine d'activité</label>
                        <input type="text" name="domaine">
                    </div>
                    <div class="field">
                        <label>Province ou ville souhaitée au Canada</label>
                        <input type="text" name="ville_canada">
                    </div>
                    <div class="field">
                        <label>Salaire souhaité (facultatif)</label>
                        <input type="text" name="salaire">
                    </div>
                </div>

                <!-- 3. Formation -->
                <div class="section">
                    <div class="section-title">3. FORMATION</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Diplôme</th>
                                <th>Établissement</th>
                                <th>Année</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td><input type="text" name="form_1_diplome"></td><td><input type="text" name="form_1_etab"></td><td><input type="text" name="form_1_annee"></td></tr>
                            <tr><td><input type="text" name="form_2_diplome"></td><td><input type="text" name="form_2_etab"></td><td><input type="text" name="form_2_annee"></td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- 5. Compétences -->
                <div class="section">
                    <div class="section-title">5. COMPÉTENCES</div>
                    <div class="checkbox-group" style="grid-template-columns: 1fr 1fr 1fr;">
                        <label><input type="checkbox" name="comp_info"> Informatique</label>
                        <label><input type="checkbox" name="comp_cuisine"> Cuisine</label>
                        <label><input type="checkbox" name="comp_mecanique"> Mécanique</label>
                        <label><input type="checkbox" name="comp_conduite"> Conduite</label>
                        <label><input type="checkbox" name="comp_construction"> Construction</label>
                        <label><input type="checkbox" name="comp_commerce"> Commerce</label>
                        <label><input type="checkbox" name="comp_agriculture"> Agriculture</label>
                        <label><input type="checkbox" name="comp_sante"> Santé</label>
                        <label style="grid-column: span 1;"><input type="checkbox" name="comp_autres"> Autres <input type="text" style="border-bottom:1px solid #000; width: 50px;"></label>
                    </div>
                </div>

                <!-- 7. Disponibilité -->
                <div class="section">
                    <div class="section-title">7. DISPONIBILITÉ</div>
                    <p style="font-size: 13px; margin-top: 0;">Êtes-vous disponible pour travailler au Canada ?</p>
                    <div style="margin-bottom: 10px;">
                        <label><input type="radio" name="dispo_canada" value="oui"> Oui</label>
                        <label style="margin-left: 15px;"><input type="radio" name="dispo_canada" value="non"> Non</label>
                    </div>
                    <div class="field">
                        <label>Date de disponibilité</label>
                        <input type="date" name="date_dispo">
                    </div>
                </div>

                <!-- 9. Déclaration -->
                <div class="section">
                    <div class="section-title">9. DÉCLARATION</div>
                    <p class="declaration">
                        Je certifie que les informations fournies dans ce formulaire sont exactes et complètes.
                    </p>
                    <div class="field">
                        <label>Nom du candidat</label>
                        <input type="text" name="nom_declaration">
                    </div>
                    <div class="signature-area">
                        <div class="field" style="width: 60%;">
                            <label>Signature</label>
                            <input type="text" name="signature">
                        </div>
                        <div class="field" style="width: 35%;">
                            <label>Date</label>
                            <input type="date" name="date_signature">
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- Submit Button (Not in original, but needed for web) -->
        <button type="submit" class="submit-btn">Soumettre la demande</button>

    </form>
</div>

</body>
</html>
