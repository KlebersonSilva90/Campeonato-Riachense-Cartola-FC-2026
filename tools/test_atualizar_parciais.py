import unittest

from atualizar_parciais import calcular_pontuacao


def atleta(atleta_id, posicao, clube=1):
    return {"atleta_id": atleta_id, "posicao_id": posicao, "clube_id": clube}


def parcial(pontos, entrou=True):
    return {"pontuacao": pontos, "entrou_em_campo": entrou}


class CalculoParciaisTest(unittest.TestCase):
    def test_aplica_capitao_banco_normal_e_reserva_de_luxo(self):
        time = {
            "capitao_id": 6,
            "reserva_luxo_id": 14,
            "atletas": [
                atleta(1, 2),
                atleta(2, 6),
                atleta(3, 5),
                atleta(4, 3),
                atleta(5, 4),
                atleta(6, 5),
                atleta(7, 1),
                atleta(8, 4),
                atleta(9, 3),
                atleta(10, 5),
                atleta(11, 4),
                atleta(12, 2),
            ],
            "reservas": [atleta(13, 2), atleta(14, 4)],
        }
        pontuacoes = {
            "2": parcial(7.44),
            "3": parcial(14.8),
            "4": parcial(1.2),
            "5": parcial(12.4),
            "6": parcial(22.8),
            "7": parcial(1.6),
            "8": parcial(6.5),
            "9": parcial(5),
            "10": parcial(0.8),
            "11": parcial(7.8),
            "12": parcial(8.2),
            "13": parcial(11.2),
            "14": parcial(10.4),
        }
        self.assertEqual(calcular_pontuacao(time, pontuacoes), 115.04)

    def test_reserva_de_luxo_nao_faz_duas_substituicoes(self):
        time = {
            "capitao_id": None,
            "reserva_luxo_id": 3,
            "atletas": [atleta(1, 4), atleta(2, 4)],
            "reservas": [atleta(3, 4)],
        }
        pontuacoes = {"2": parcial(2), "3": parcial(8)}
        self.assertEqual(calcular_pontuacao(time, pontuacoes), 10)

    def test_nao_usa_reserva_antes_do_jogo_do_titular(self):
        time = {
            "capitao_id": None,
            "reserva_luxo_id": None,
            "atletas": [atleta(1, 4, clube=263), atleta(2, 4, clube=275)],
            "reservas": [atleta(3, 4, clube=275)],
        }
        pontuacoes = {"2": parcial(6.5), "3": parcial(10.4)}
        self.assertEqual(
            calcular_pontuacao(time, pontuacoes, clubes_com_jogo_encerrado={275}),
            6.5,
        )


if __name__ == "__main__":
    unittest.main()
